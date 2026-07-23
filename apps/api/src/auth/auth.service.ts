import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  BusinessRelationship,
  BusinessSource,
  Prisma,
  TrainerAccessLevel,
  TrainerCapability,
  TrainerCapabilityStatus,
  User,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { AuthEmailService } from './auth-email.service';
import { PrismaService } from '../database/prisma.service';
import { DeliverableLifecycleService } from '../deliverables/deliverable-lifecycle.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenDto } from './dto/token.dto';
import { addMinutes, createPlainToken, hashPassword, hashToken, verifyPassword } from './auth.tokens';
import { trainerCapabilityAllowsAccess } from '../trainers/trainer-access';

const SESSION_DURATION_MINUTES = 60 * 24 * 30;
const VERIFICATION_DURATION_MINUTES = 60 * 24;
const authUserInclude = Prisma.validator<Prisma.UserInclude>()({
  trainerCapability: true,
});
type AccessCheckedUser = Prisma.UserGetPayload<{
  include: typeof authUserInclude;
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: AuthEmailService,
    private readonly deliverableLifecycle: DeliverableLifecycleService,
  ) {}

  async signup(dto: SignupDto) {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new BadRequestException('An account already exists for this email.');

    const { firstName, lastName } = this.splitName(dto.representativeName);
    const plainVerificationToken = createPlainToken();
    const verificationTokenHash = await hashToken(plainVerificationToken);
    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email, firstName, lastName, phone: dto.phone.trim(), timezone: dto.timezone?.trim() || null, passwordHash, role: UserRole.entrepreneur, status: UserStatus.pending },
      });
      const business = await tx.business.create({
        data: {
          name: dto.businessName.trim(), country: dto.country.trim(), source: BusinessSource.self_registered,
          onboardingCompletedAt: new Date(), sectorId: dto.sectorId, stageId: dto.stageId,
        },
      });
      await tx.businessMembership.create({
        data: { userId: createdUser.id, businessId: business.id, relationship: BusinessRelationship.representative, isPrimary: true },
      });
      await this.deliverableLifecycle.syncInstancesForEntrepreneur(tx, createdUser.id);
      await tx.emailVerificationToken.create({
        data: { userId: createdUser.id, tokenHash: verificationTokenHash, expiresAt: addMinutes(new Date(), VERIFICATION_DURATION_MINUTES) },
      });
      return createdUser;
    });

    await this.email.sendVerification(user.email, this.displayName(user), plainVerificationToken);
    return { user: this.serializeUser(user), verification: { queued: true } };
  }

  async login(dto: LoginDto) {
    const found = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
      include: authUserInclude,
    });
    if (!found || !(await verifyPassword(dto.password, found.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (found.status === UserStatus.inactive) throw new UnauthorizedException('This account is inactive.');
    await this.assertTrainerAccess(found);

    const user = await this.prisma.user.update({ where: { id: found.id }, data: { lastLoginAt: new Date() } });
    const sessionToken = await this.createSession(user.id);
    return {
      user: this.serializeUser(user, found.trainerCapability), sessionToken,
      session: { mode: 'cookie', expiresAt: addMinutes(new Date(), SESSION_DURATION_MINUTES) },
    };
  }

  async me(sessionToken?: string) {
    if (!sessionToken) return { user: null };
    const user = await this.validateSession(sessionToken);
    return { user: user ? await this.serializeUserWithOnboarding(user) : null };
  }

  async validateSession(sessionToken?: string) {
    return sessionToken ? this.findUserBySession(sessionToken) : null;
  }

  async refresh(sessionToken?: string) {
    if (!sessionToken) throw new UnauthorizedException('Session is required.');
    const activeSession = await this.findActiveSession(sessionToken);
    if (!activeSession) throw new UnauthorizedException('Session is invalid or expired.');

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: activeSession.userId },
      include: authUserInclude,
    });
    if (user.status === UserStatus.inactive) {
      await this.revokeSessionsForAccess(user.id, 'account_inactive');
      throw new UnauthorizedException('This account is inactive.');
    }
    await this.assertTrainerAccess(user);

    const nextSessionToken = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({ where: { id: activeSession.id }, data: { revokedAt: new Date(), revokedReason: 'rotated' } });
      return this.createSession(activeSession.userId, tx);
    });
    return {
      user: this.serializeUser(user, user.trainerCapability), sessionToken: nextSessionToken,
      session: { mode: 'cookie', expiresAt: addMinutes(new Date(), SESSION_DURATION_MINUTES) },
    };
  }

  async logout(sessionToken?: string) {
    if (sessionToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: await hashToken(sessionToken), revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'logout' },
      });
    }
    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalizeEmail(dto.email) } });
    if (!user || user.status === UserStatus.inactive) return { ok: true };

    const plainToken = createPlainToken();
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: new Date() } }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: await hashToken(plainToken), expiresAt: addMinutes(new Date(), 30) },
      }),
    ]);
    await this.email.sendPasswordReset(user.email, this.displayName(user), plainToken);
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: await hashToken(dto.token) },
      include: { user: { select: { email: true } } },
    });
    if (!resetToken || resetToken.consumedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash: await hashPassword(dto.password) } }),
      this.prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { consumedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { userId: resetToken.userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'password_reset' } }),
    ]);
    return { ok: true, email: resetToken.user.email };
  }

  async verifyEmail(dto: TokenDto) {
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash: await hashToken(dto.token) } });
    if (!verificationToken || verificationToken.consumedAt || verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('This verification link is invalid or has expired.');
    }
    const now = new Date();
    const user = await this.prisma.$transaction(async (tx) => {
      const verifiedUser = await tx.user.update({
        where: { id: verificationToken.userId }, data: { emailVerifiedAt: now, status: UserStatus.active },
      });
      await tx.emailVerificationToken.update({ where: { id: verificationToken.id }, data: { consumedAt: now } });
      return verifiedUser;
    });
    void this.email.sendWelcome(user.email, this.displayName(user)).catch(() => undefined);
    return { user: this.serializeUser(user) };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalizeEmail(dto.email) } });
    if (!user || user.emailVerifiedAt || user.status === UserStatus.inactive) return { ok: true };

    const plainToken = createPlainToken();
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: now } }),
      this.prisma.emailVerificationToken.create({
        data: { userId: user.id, tokenHash: await hashToken(plainToken), expiresAt: addMinutes(now, VERIFICATION_DURATION_MINUTES) },
      }),
    ]);
    await this.email.sendVerification(user.email, this.displayName(user), plainToken);
    return { ok: true };
  }

  private async serializeUserWithOnboarding(user: AccessCheckedUser) {
    if (user.role !== UserRole.entrepreneur) return { ...this.serializeUser(user, user.trainerCapability), onboardingRequired: false };
    const membership = await this.prisma.businessMembership.findFirst({
      where: { userId: user.id, isPrimary: true }, include: { business: true },
    });
    return { ...this.serializeUser(user, user.trainerCapability), onboardingRequired: !membership?.business.onboardingCompletedAt };
  }

  private serializeUser(
    user: User,
    trainerCapability?: Pick<
      TrainerCapability,
      'accessLevel' | 'accessExpiresOn'
    > | null,
  ) {
    return {
      id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone,
      role: user.role, status: user.status, emailVerifiedAt: user.emailVerifiedAt,
      trainerAccessExpiresAt:
        user.role === UserRole.trainer &&
        trainerCapability?.accessLevel === TrainerAccessLevel.guest
          ? trainerCapability.accessExpiresOn?.toISOString() ?? null
          : null,
    };
  }

  async createSession(userId: string, tx: Pick<PrismaService, 'refreshToken'> = this.prisma) {
    const sessionToken = createPlainToken(48);
    await tx.refreshToken.create({
      data: { userId, tokenHash: await hashToken(sessionToken), expiresAt: addMinutes(new Date(), SESSION_DURATION_MINUTES) },
    });
    return sessionToken;
  }

  private async findUserBySession(sessionToken: string) {
    const activeSession = await this.findActiveSession(sessionToken);
    if (!activeSession) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: activeSession.userId },
      include: authUserInclude,
    });
    if (!user) return null;
    const denial = this.trainerAccessDenial(user);
    if (!denial) return user;
    await this.revokeSessionsForAccess(user.id, 'trainer_access_expired');
    return null;
  }

  private async findActiveSession(sessionToken: string) {
    return this.prisma.refreshToken.findFirst({
      where: { tokenHash: await hashToken(sessionToken), revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  private async assertTrainerAccess(user: AccessCheckedUser) {
    const denial = this.trainerAccessDenial(user);
    if (!denial) return;
    await this.revokeSessionsForAccess(user.id, 'trainer_access_expired');
    throw new UnauthorizedException(denial);
  }

  private trainerAccessDenial(user: AccessCheckedUser) {
    if (user.role !== UserRole.trainer) return null;
    const capability = user.trainerCapability;
    if (!capability || capability.status !== TrainerCapabilityStatus.active) {
      return 'Trainer access is inactive. Contact an administrator for assistance.';
    }
    if (!trainerCapabilityAllowsAccess(capability)) {
      return 'Trainer access has expired. Contact an administrator to restore access.';
    }
    return null;
  }

  private revokeSessionsForAccess(userId: string, reason: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  private normalizeEmail(email: string) { return email.trim().toLowerCase(); }

  private splitName(name: string) {
    const parts = name.trim().split(/\s+/);
    return { firstName: parts[0] ?? null, lastName: parts.slice(1).join(' ') || null };
  }

  private displayName(user: Pick<User, 'firstName' | 'email'>) {
    return user.firstName?.trim() || user.email.split('@')[0];
  }
}
