import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { BusinessRelationship, BusinessSource, User, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenDto } from './dto/token.dto';
import { addMinutes, createPlainToken, hashPassword, hashToken, verifyPassword } from './auth.tokens';

const SESSION_DURATION_MINUTES = 60 * 24 * 30;

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

    const sessionToken = await this.createSession(user.id);

    return {
      user: this.serializeUser(user),
      sessionToken,
      session: {
        mode: 'cookie',
        expiresAt: addMinutes(new Date(), SESSION_DURATION_MINUTES),
      },
    };
  }

  async me(sessionToken?: string) {
    if (!sessionToken) {
      return { user: null };
    }

    const user = await this.validateSession(sessionToken);
    return { user: user ? this.serializeUser(user) : null };
  }

  async validateSession(sessionToken?: string) {
    if (!sessionToken) {
      return null;
    }

    return this.findUserBySession(sessionToken);
  }

  async refresh(sessionToken?: string) {
    if (!sessionToken) {
      throw new UnauthorizedException('Session is required.');
    }

    const activeSession = await this.findActiveSession(sessionToken);
    if (!activeSession) {
      throw new UnauthorizedException('Session is invalid or expired.');
    }

    const nextSessionToken = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: activeSession.id },
        data: {
          revokedAt: new Date(),
          revokedReason: 'rotated',
        },
      });

      return this.createSession(activeSession.userId, tx);
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: activeSession.userId } });

    return {
      user: this.serializeUser(user),
      sessionToken: nextSessionToken,
      session: {
        mode: 'cookie',
        expiresAt: addMinutes(new Date(), SESSION_DURATION_MINUTES),
      },
    };
  }

  async logout(sessionToken?: string) {
    if (!sessionToken) {
      return { ok: true };
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: await hashToken(sessionToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'logout',
      },
    });

    return { ok: true };
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

  private async createSession(
    userId: string,
    tx: Pick<PrismaService, 'refreshToken'> = this.prisma,
  ) {
    const sessionToken = createPlainToken(48);
    await tx.refreshToken.create({
      data: {
        userId,
        tokenHash: await hashToken(sessionToken),
        expiresAt: addMinutes(new Date(), SESSION_DURATION_MINUTES),
      },
    });

    return sessionToken;
  }

  private async findUserBySession(sessionToken: string) {
    const activeSession = await this.findActiveSession(sessionToken);
    if (!activeSession) {
      return null;
    }

    return this.prisma.user.findUnique({ where: { id: activeSession.userId } });
  }

  private async findActiveSession(sessionToken: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: await hashToken(sessionToken),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
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
