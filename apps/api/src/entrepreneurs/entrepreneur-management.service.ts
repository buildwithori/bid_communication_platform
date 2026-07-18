import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessRelationship,
  BusinessSource,
  BusinessStatus,
  InvitationStatus,
  ProgrammeAccessType,
  User,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import {
  addMinutes,
  createPlainToken,
  hashPassword,
  hashToken,
} from '../auth/auth.tokens';
import { PrismaService } from '../database/prisma.service';
import { DeliverableLifecycleService } from '../deliverables/deliverable-lifecycle.service';
import {
  AcceptEntrepreneurInvitationDto,
  EntrepreneurProfileDto,
  InviteEntrepreneurDto,
  ProgrammeAccessDto,
  UpdateEntrepreneurStatusDto,
} from './dto/entrepreneur-actions.dto';
import { EntrepreneursEmailService } from './entrepreneurs-email.service';
import { EntrepreneursService } from './entrepreneurs.service';

const INVITATION_DURATION_MINUTES = 60 * 24 * 7;

@Injectable()
export class EntrepreneurManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EntrepreneursEmailService,
    private readonly entrepreneurs: EntrepreneursService,
    private readonly deliverableLifecycle: DeliverableLifecycleService,
  ) {}

  async invite(actor: User, dto: InviteEntrepreneurDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException(
        'An account or pending invitation already exists for this email.',
      );
    }
    await this.validateProfile(dto);
    await this.validateProgrammeIds(dto.programmeIds);

    const plainToken = createPlainToken();
    const tokenHash = await hashToken(plainToken);
    const expiresAt = addMinutes(new Date(), INVITATION_DURATION_MINUTES);
    const created = await this.audit.capture(
      {
        action: 'entrepreneurs.invitation.created',
        entityType: 'entrepreneurUser',
        entityId: (result) => result.id,
        summary: (result) => `Invited entrepreneur ${result.name}`,
        payload: { programmeIds: dto.programmeIds },
      },
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone?.trim() || null,
            ...(dto.timezone !== undefined ? { timezone: dto.timezone.trim() } : {}),
            role: UserRole.entrepreneur,
            status: UserStatus.pending,
            invitedById: actor.id,
          },
        });
        const business = await tx.business.create({
          data: {
            name: dto.businessName.trim(),
            country: dto.country.trim(),
            sectorId: dto.sectorId || null,
            stageId: dto.stageId || null,
            source: BusinessSource.admin_invited,
            status: BusinessStatus.active,
            onboardingCompletedAt: new Date(),
          },
        });
        await tx.businessMembership.create({
          data: {
            userId: user.id,
            businessId: business.id,
            relationship: BusinessRelationship.representative,
            isPrimary: true,
          },
        });
        if (dto.programmeIds.length) {
          await tx.programmeAccessGrant.createMany({
            data: dto.programmeIds.map((programmeId) => ({
              programmeId,
              entrepreneurUserId: user.id,
              grantedById: actor.id,
            })),
          });
        }
        await this.deliverableLifecycle.syncInstancesForEntrepreneur(tx, user.id);
        await tx.invitation.create({
          data: {
            email,
            role: UserRole.entrepreneur,
            tokenHash,
            invitedById: actor.id,
            expiresAt,
          },
        });
        return {
          id: user.id,
          name: this.displayName(user),
          email: user.email,
          firstName: user.firstName,
          businessName: business.name,
        };
      },
    );

    await this.email.sendInvitation(
      created.email,
      created.firstName?.trim() || created.email,
      created.businessName,
      this.displayName(actor),
      plainToken,
    );
    return this.entrepreneurs.getEntrepreneur(actor, created.id);
  }

  async resendInvitation(actor: User, entrepreneurUserId: string) {
    const entrepreneur = await this.findEntrepreneur(entrepreneurUserId);
    if (entrepreneur.status !== UserStatus.pending) {
      throw new BadRequestException(
        'Only pending entrepreneur invitations can be resent.',
      );
    }
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        email: entrepreneur.email,
        role: UserRole.entrepreneur,
        status: InvitationStatus.pending,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!invitation) {
      throw new NotFoundException('Pending entrepreneur invitation was not found.');
    }

    const plainToken = createPlainToken();
    const tokenHash = await hashToken(plainToken);
    const expiresAt = addMinutes(new Date(), INVITATION_DURATION_MINUTES);
    await this.audit.capture(
      {
        action: 'entrepreneurs.invitation.resent',
        entityType: 'entrepreneurUser',
        entityId: () => entrepreneur.id,
        summary: `Resent entrepreneur invitation to ${entrepreneur.email}`,
      },
      (tx) =>
        tx.invitation.update({
          where: { id: invitation.id },
          data: { tokenHash, expiresAt },
        }),
    );
    await this.email.sendInvitation(
      entrepreneur.email,
      entrepreneur.firstName?.trim() || entrepreneur.email,
      entrepreneur.businessMemberships[0]?.business.name ?? 'your business',
      this.displayName(actor),
      plainToken,
    );
    return { ok: true, expiresAt: expiresAt.toISOString() };
  }

  async acceptInvitation(dto: AcceptEntrepreneurInvitationDto) {
    const tokenHash = await hashToken(dto.token);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
    });
    if (
      !invitation ||
      invitation.role !== UserRole.entrepreneur ||
      invitation.status !== InvitationStatus.pending ||
      invitation.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        'This entrepreneur invitation is invalid or has expired.',
      );
    }
    const entrepreneur = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });
    if (
      !entrepreneur ||
      entrepreneur.role !== UserRole.entrepreneur ||
      entrepreneur.status !== UserStatus.pending
    ) {
      throw new BadRequestException(
        'This entrepreneur invitation can no longer be accepted.',
      );
    }

    const passwordHash = await hashPassword(dto.password);
    const now = new Date();
    const activated = await this.audit.capture(
      {
        action: 'entrepreneurs.invitation.accepted',
        entityType: 'entrepreneurUser',
        entityId: () => entrepreneur.id,
        summary: `${this.displayName(entrepreneur)} accepted an entrepreneur invitation`,
      },
      async (tx) => {
        const user = await tx.user.update({
          where: { id: entrepreneur.id },
          data: {
            passwordHash,
            status: UserStatus.active,
            emailVerifiedAt: now,
          },
        });
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: InvitationStatus.accepted,
            acceptedAt: now,
          },
        });
        await tx.invitation.updateMany({
          where: {
            email: invitation.email,
            role: UserRole.entrepreneur,
            status: InvitationStatus.pending,
            id: { not: invitation.id },
          },
          data: { status: InvitationStatus.revoked, revokedAt: now },
        });
        return user;
      },
    );
    return this.entrepreneurs.getEntrepreneur(activated, activated.id);
  }

  update(actor: User, entrepreneurUserId: string, dto: EntrepreneurProfileDto) {
    return this.updateProfile(
      actor,
      entrepreneurUserId,
      dto,
      'entrepreneurs.profile.updated',
    );
  }

  updateMyProfile(user: User, dto: EntrepreneurProfileDto) {
    return this.updateProfile(
      user,
      user.id,
      dto,
      'entrepreneurs.self-profile.updated',
    );
  }

  myProfile(user: User) {
    return this.entrepreneurs.getEntrepreneur(user, user.id);
  }

  async updateStatus(
    actor: User,
    entrepreneurUserId: string,
    dto: UpdateEntrepreneurStatusDto,
  ) {
    const entrepreneur = await this.findEntrepreneur(entrepreneurUserId);
    if (entrepreneur.status === UserStatus.pending) {
      throw new BadRequestException(
        'Pending invitations cannot be activated or disabled manually.',
      );
    }
    const userStatus =
      dto.status === BusinessStatus.active
        ? UserStatus.active
        : UserStatus.inactive;
    await this.audit.capture(
      {
        action: 'entrepreneurs.status.updated',
        entityType: 'entrepreneurUser',
        entityId: () => entrepreneur.id,
        summary: `Updated entrepreneur status to ${dto.status}`,
        payload: {
          previousUserStatus: entrepreneur.status,
          nextBusinessStatus: dto.status,
        },
      },
      async (tx) => {
        await tx.user.update({
          where: { id: entrepreneur.id },
          data: { status: userStatus },
        });
        await tx.business.update({
          where: { id: entrepreneur.businessMemberships[0].business.id },
          data: { status: dto.status },
        });
        return { id: entrepreneur.id };
      },
    );
    return this.entrepreneurs.getEntrepreneur(actor, entrepreneur.id);
  }

  async grantProgramme(
    actor: User,
    entrepreneurUserId: string,
    dto: ProgrammeAccessDto,
  ) {
    const entrepreneur = await this.findEntrepreneur(entrepreneurUserId);
    const programme = await this.validateProgrammeGrant(
      dto.programmeId,
      entrepreneurUserId,
    );
    await this.audit.capture(
      {
        action: 'entrepreneurs.programme-access.granted',
        entityType: 'entrepreneurUser',
        entityId: () => entrepreneur.id,
        summary: `Granted access to ${programme.name}`,
        payload: { programmeId: programme.id },
      },
      async (tx) => {
        const grant = await tx.programmeAccessGrant.upsert({
          where: {
            programmeId_entrepreneurUserId: {
              programmeId: programme.id,
              entrepreneurUserId,
            },
          },
          create: {
            programmeId: programme.id,
            entrepreneurUserId,
            grantedById: actor.id,
          },
          update: {
            grantedById: actor.id,
            grantedAt: new Date(),
            revokedAt: null,
            revokeReason: null,
          },
        });
        await this.deliverableLifecycle.syncInstancesForEntrepreneur(tx, entrepreneurUserId);
        return grant;
      },
    );
    return this.entrepreneurs.getEntrepreneur(actor, entrepreneur.id);
  }

  async revokeProgramme(
    actor: User,
    entrepreneurUserId: string,
    dto: ProgrammeAccessDto,
  ) {
    const entrepreneur = await this.findEntrepreneur(entrepreneurUserId);
    const grant = await this.prisma.programmeAccessGrant.findFirst({
      where: {
        programmeId: dto.programmeId,
        entrepreneurUserId,
        revokedAt: null,
      },
      include: { programme: { select: { name: true } } },
    });
    if (!grant) {
      throw new NotFoundException('Active programme access was not found.');
    }
    await this.audit.capture(
      {
        action: 'entrepreneurs.programme-access.revoked',
        entityType: 'entrepreneurUser',
        entityId: () => entrepreneur.id,
        summary: `Revoked access to ${grant.programme.name}`,
        payload: { programmeId: dto.programmeId, reason: dto.reason ?? null },
      },
      (tx) =>
        tx.programmeAccessGrant.update({
          where: { id: grant.id },
          data: {
            revokedAt: new Date(),
            revokeReason: dto.reason?.trim() || null,
          },
        }),
    );
    return this.entrepreneurs.getEntrepreneur(actor, entrepreneur.id);
  }

  private async updateProfile(
    actor: User,
    entrepreneurUserId: string,
    dto: EntrepreneurProfileDto,
    action: string,
  ) {
    const entrepreneur = await this.findEntrepreneur(entrepreneurUserId);
    await this.validateProfile(dto);
    await this.audit.capture(
      {
        action,
        entityType: 'entrepreneurUser',
        entityId: () => entrepreneur.id,
        summary: `Updated entrepreneur ${this.displayName(entrepreneur)}`,
      },
      async (tx) => {
        await tx.user.update({
          where: { id: entrepreneur.id },
          data: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone?.trim() || null,
          },
        });
        await tx.business.update({
          where: { id: entrepreneur.businessMemberships[0].business.id },
          data: {
            name: dto.businessName.trim(),
            country: dto.country.trim(),
            sectorId: dto.sectorId || null,
            stageId: dto.stageId || null,
          },
        });
        await this.deliverableLifecycle.syncInstancesForEntrepreneur(
          tx,
          entrepreneur.id,
        );
        return { id: entrepreneur.id };
      },
    );
    return this.entrepreneurs.getEntrepreneur(actor, entrepreneur.id);
  }

  private async validateProfile(dto: EntrepreneurProfileDto) {
    const [sectorCount, stageCount] = await Promise.all([
      dto.sectorId
        ? this.prisma.sector.count({
            where: { id: dto.sectorId, active: true },
          })
        : Promise.resolve(1),
      dto.stageId
        ? this.prisma.businessStage.count({
            where: { id: dto.stageId, active: true },
          })
        : Promise.resolve(1),
    ]);
    if (!sectorCount) {
      throw new BadRequestException('Select a valid active sector.');
    }
    if (!stageCount) {
      throw new BadRequestException('Select a valid active business stage.');
    }
  }

  private async validateProgrammeIds(programmeIds: string[]) {
    if (!programmeIds.length) return;
    const programmes = await this.prisma.programme.findMany({
      where: {
        id: { in: programmeIds },
        accessType: ProgrammeAccessType.assigned,
        publishedAt: { not: null },
        archivedAt: null,
      },
      select: { id: true },
    });
    if (programmes.length !== programmeIds.length) {
      throw new BadRequestException(
        'One or more selected programmes are unavailable for assignment.',
      );
    }
  }

  private async validateProgrammeGrant(
    programmeId: string,
    entrepreneurUserId: string,
  ) {
    const programme = await this.prisma.programme.findFirst({
      where: {
        id: programmeId,
        accessType: ProgrammeAccessType.assigned,
        publishedAt: { not: null },
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        maxEntrepreneurs: true,
        _count: {
          select: {
            accessGrants: { where: { revokedAt: null } },
          },
        },
      },
    });
    if (!programme) {
      throw new BadRequestException(
        'Select a published assigned-access programme.',
      );
    }
    const currentGrant = await this.prisma.programmeAccessGrant.findUnique({
      where: {
        programmeId_entrepreneurUserId: { programmeId, entrepreneurUserId },
      },
      select: { revokedAt: true },
    });
    if (
      (!currentGrant || currentGrant.revokedAt) &&
      programme._count.accessGrants >= programme.maxEntrepreneurs
    ) {
      throw new BadRequestException('This programme has reached its capacity.');
    }
    return programme;
  }

  private findEntrepreneur(id: string) {
    return this.prisma.user
      .findFirst({
        where: { id, role: UserRole.entrepreneur },
        include: {
          businessMemberships: {
            where: { isPrimary: true },
            take: 1,
            include: { business: true },
          },
        },
      })
      .then((entrepreneur) => {
        if (!entrepreneur || !entrepreneur.businessMemberships[0]) {
          throw new NotFoundException('Entrepreneur was not found.');
        }
        return entrepreneur;
      });
  }

  private displayName(
    user: Pick<User, 'firstName' | 'lastName' | 'email'>,
  ) {
    return (
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email
    );
  }
}
