import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, BusinessRelationship, BusinessSource, UserRole, UserStatus } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../database/prisma.service';
import { DeliverableLifecycleService } from '../deliverables/deliverable-lifecycle.service';
import { AuthEmailService } from './auth-email.service';
import { AuthService } from './auth.service';
import { createPlainToken } from './auth.tokens';
import { GoogleOnboardingDto } from './dto/google-onboarding.dto';

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly deliverableLifecycle: DeliverableLifecycleService,
    private readonly email: AuthEmailService,
  ) {}

  createAuthorization(mode: 'login' | 'signup') {
    const client = this.client();
    const state = createPlainToken(32);
    const url = client.generateAuthUrl({
      access_type: 'online', prompt: 'select_account', state,
      scope: ['openid', 'email', 'profile'],
      include_granted_scopes: true,
    });
    return { state, mode, url };
  }

  async handleCallback(code: string, expectedState: string, returnedState: string, mode: 'login' | 'signup') {
    if (!code || !returnedState || returnedState !== expectedState) {
      throw new BadRequestException('Google authentication state is invalid or expired.');
    }
    const client = this.client();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) throw new BadRequestException('Google did not return an identity token.');
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: this.clientId() });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) {
      throw new BadRequestException('Google account email must be verified.');
    }

    const email = profile.email.trim().toLowerCase();
    let user = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: AuthProvider.google, providerAccountId: profile.sub } },
      include: { user: true },
    }).then((account) => account?.user ?? null);

    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (!byEmail && mode === 'login') {
        throw new UnauthorizedException('No BID Hub account exists for this Google email.');
      }
      if (byEmail && byEmail.role !== UserRole.entrepreneur) {
        throw new ForbiddenException('Google account entry is available to entrepreneur accounts only.');
      }
      user = await this.prisma.$transaction(async (tx) => {
        const linkedUser = byEmail ?? await tx.user.create({
          data: {
            email, firstName: profile.given_name ?? profile.name?.split(' ')[0] ?? null,
            lastName: profile.family_name ?? null, avatarUrl: profile.picture ?? null,
            role: UserRole.entrepreneur, status: UserStatus.active, emailVerifiedAt: new Date(),
          },
        });
        if (!linkedUser.emailVerifiedAt) {
          await tx.user.update({ where: { id: linkedUser.id }, data: { emailVerifiedAt: new Date(), status: UserStatus.active } });
        }
        await tx.oAuthAccount.create({
          data: { userId: linkedUser.id, provider: AuthProvider.google, providerAccountId: profile.sub!, email },
        });
        return tx.user.findUniqueOrThrow({ where: { id: linkedUser.id } });
      });
    }

    if (user.status === UserStatus.inactive) throw new ForbiddenException('This account is inactive.');
    const sessionToken = await this.auth.createSession(user.id);
    const onboardingRequired = await this.onboardingRequired(user.id);
    return { user: this.serializeUser(user, onboardingRequired), sessionToken, onboardingRequired };
  }

  async getOnboarding(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== UserRole.entrepreneur) throw new ForbiddenException('Onboarding is only available to entrepreneur accounts.');
    return { user: this.serializeUser(user, await this.onboardingRequired(userId)) };
  }

  async completeOnboarding(userId: string, dto: GoogleOnboardingDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== UserRole.entrepreneur || user.email !== dto.email.trim().toLowerCase()) {
      throw new ForbiddenException('Onboarding details do not match the authenticated entrepreneur.');
    }
    const { firstName, lastName } = this.splitName(dto.representativeName);
    const completedNow = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { firstName, lastName, phone: dto.phone.trim() } });
      const membership = await tx.businessMembership.findFirst({ where: { userId, isPrimary: true }, include: { business: true } });
      let claimedCompletion = false;

      if (membership) {
        const completion = await tx.business.updateMany({
          where: { id: membership.businessId, onboardingCompletedAt: null },
          data: { name: dto.businessName.trim(), country: dto.country.trim(), onboardingCompletedAt: new Date() },
        });
        claimedCompletion = completion.count === 1;
        if (!claimedCompletion) {
          await tx.business.update({
            where: { id: membership.businessId },
            data: { name: dto.businessName.trim(), country: dto.country.trim() },
          });
        }
      } else {
        const business = await tx.business.create({
          data: {
            name: dto.businessName.trim(),
            country: dto.country.trim(),
            source: BusinessSource.self_registered,
            onboardingCompletedAt: new Date(),
          },
        });
        await tx.businessMembership.create({
          data: { userId, businessId: business.id, relationship: BusinessRelationship.representative, isPrimary: true },
        });
        claimedCompletion = true;
      }

      await this.deliverableLifecycle.syncInstancesForEntrepreneur(tx, userId);
      return claimedCompletion;
    });

    if (completedNow) {
      await this.email.sendWelcome(user.email, firstName?.trim() || user.email.split('@')[0]);
    }

    return this.getOnboarding(userId);
  }

  private async onboardingRequired(userId: string) {
    const membership = await this.prisma.businessMembership.findFirst({ where: { userId, isPrimary: true }, include: { business: true } });
    return !membership?.business.onboardingCompletedAt;
  }

  private client() {
    const secret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!secret) throw new ServiceUnavailableException('Google authentication is not configured.');
    return new OAuth2Client(this.clientId(), secret, this.redirectUri());
  }

  private clientId() {
    const value = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!value) throw new ServiceUnavailableException('Google authentication is not configured.');
    return value;
  }

  private redirectUri() {
    return this.config.get<string>('GOOGLE_REDIRECT_URI') ?? `${this.config.getOrThrow<string>('API_PUBLIC_URL').replace(/\/$/, '')}/api/auth/google/callback`;
  }

  private splitName(name: string) {
    const parts = name.trim().split(/\s+/);
    return { firstName: parts[0] ?? null, lastName: parts.slice(1).join(' ') || null };
  }

  private serializeUser(user: { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null; role: UserRole; status: UserStatus; emailVerifiedAt: Date | null }, onboardingRequired: boolean) {
    return { ...user, onboardingRequired };
  }
}
