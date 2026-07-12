import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { BusinessRelationship, BusinessSource, User, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenDto } from './dto/token.dto';
import { addMinutes, createPlainToken, hashPassword, hashToken, verifyPassword } from './auth.tokens';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signup(dto: SignupDto) {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new BadRequestException('An account already exists for this email.');
    }

    const { firstName, lastName } = this.splitName(dto.representativeName);
    const plainVerificationToken = createPlainToken();
    const verificationTokenHash = await hashToken(plainVerificationToken);
    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          phone: dto.phone.trim(),
          passwordHash,
          role: UserRole.entrepreneur,
          status: UserStatus.pending,
        },
      });

      const business = await tx.business.create({
        data: {
          name: dto.businessName.trim(),
          country: dto.country.trim(),
          source: BusinessSource.self_registered,
          onboardingCompletedAt: new Date(),
          sectorId: dto.sectorId,
          stageId: dto.stageId,
        },
      });

      await tx.businessMembership.create({
        data: {
          userId: createdUser.id,
          businessId: business.id,
          relationship: BusinessRelationship.representative,
          isPrimary: true,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          tokenHash: verificationTokenHash,
          expiresAt: addMinutes(new Date(), 60 * 24),
        },
      });

      return createdUser;
    });

    return {
      user: this.serializeUser(user),
      verification: this.devTokenResponse(plainVerificationToken),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
    });

    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return {
      user: this.serializeUser(user),
      session: {
        mode: 'pending-cookie-session',
      },
    };
  }

  async me(userId?: string) {
    if (!userId) {
      return { user: null };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { user: user ? this.serializeUser(user) : null };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
    });

    if (!user) {
      return { ok: true };
    }

    const plainToken = createPlainToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: await hashToken(plainToken),
        expiresAt: addMinutes(new Date(), 30),
      },
    });

    return {
      ok: true,
      reset: this.devTokenResponse(plainToken),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = await hashToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.consumedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: await hashPassword(dto.password) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  async verifyEmail(dto: TokenDto) {
    const tokenHash = await hashToken(dto.token);
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!verificationToken || verificationToken.consumedAt || verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('This verification link is invalid or has expired.');
    }

    const now = new Date();
    const user = await this.prisma.$transaction(async (tx) => {
      const verifiedUser = await tx.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerifiedAt: now,
          status: UserStatus.active,
        },
      });

      await tx.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { consumedAt: now },
      });

      return verifiedUser;
    });

    return { user: this.serializeUser(user) };
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private splitName(name: string) {
    const parts = name.trim().split(/\s+/);
    return {
      firstName: parts[0] ?? null,
      lastName: parts.slice(1).join(' ') || null,
    };
  }

  private devTokenResponse(token: string) {
    if (process.env.NODE_ENV === 'production') {
      return { queued: true };
    }

    return {
      queued: true,
      devToken: token,
    };
  }
}
