import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvitationStatus,
  TrainerAccessLevel,
  TrainerCapabilityStatus,
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
import {
  AcceptTrainerInvitationDto,
  InviteTrainerDto,
  TrainerCapabilityDto,
  UpdateTrainerDto,
  UpdateTrainerProfileDto,
  UpdateTrainerStatusDto,
} from './dto/trainer-actions.dto';
import { TrainersEmailService } from './trainers-email.service';
import { TrainersService } from './trainers.service';

const INVITATION_DURATION_MINUTES = 60 * 24 * 7;

@Injectable()
export class TrainerManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: TrainersEmailService,
    private readonly trainers: TrainersService,
  ) {}

  async invite(actor: User, dto: InviteTrainerDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException(
        'An account or pending invitation already exists for this email.',
      );
    }
    await this.validateCapability(dto);

    const plainToken = createPlainToken();
    const tokenHash = await hashToken(plainToken);
    const expiresAt = addMinutes(new Date(), INVITATION_DURATION_MINUTES);
    const trainer = await this.audit.capture(
      {
        action: 'trainers.invitation.created',
        entityType: 'trainerUser',
        entityId: (result) => result.id,
        summary: (result) => `Invited trainer ${result.name}`,
        payload: {
          roleLabel: dto.roleLabel,
          accessLevel: dto.accessLevel,
          sectorIds: dto.sectorIds,
        },
      },
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone?.trim() || null,
            role: UserRole.trainer,
            status: UserStatus.pending,
            invitedById: actor.id,
          },
        });
        await tx.trainerCapability.create({
          data: {
            userId: user.id,
            roleLabel: dto.roleLabel,
            accessLevel: dto.accessLevel,
            accessExpiresOn: this.accessExpiry(dto),
            status: TrainerCapabilityStatus.inactive,
          },
        });
        if (dto.sectorIds.length) {
          await tx.trainerSpecialism.createMany({
            data: dto.sectorIds.map((sectorId) => ({
              userId: user.id,
              sectorId,
            })),
          });
        }
        await tx.invitation.create({
          data: {
            email,
            role: UserRole.trainer,
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
        };
      },
    );

    await this.email.sendInvitation(
      trainer.email,
      trainer.firstName?.trim() || trainer.email,
      this.displayName(actor),
      plainToken,
    );
    return this.trainers.getTrainer(actor, trainer.id);
  }

  async resendInvitation(actor: User, trainerUserId: string) {
    const trainer = await this.findTrainer(trainerUserId);
    if (trainer.status !== UserStatus.pending) {
      throw new BadRequestException(
        'Only pending trainer invitations can be resent.',
      );
    }
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        email: trainer.email,
        role: UserRole.trainer,
        status: InvitationStatus.pending,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!invitation) {
      throw new NotFoundException('Pending trainer invitation was not found.');
    }

    const plainToken = createPlainToken();
    const tokenHash = await hashToken(plainToken);
    const expiresAt = addMinutes(new Date(), INVITATION_DURATION_MINUTES);
    await this.audit.capture(
      {
        action: 'trainers.invitation.resent',
        entityType: 'trainerUser',
        entityId: () => trainer.id,
        summary: `Resent trainer invitation to ${trainer.email}`,
      },
      (tx) =>
        tx.invitation.update({
          where: { id: invitation.id },
          data: { tokenHash, expiresAt },
        }),
    );
    await this.email.sendInvitation(
      trainer.email,
      trainer.firstName?.trim() || trainer.email,
      this.displayName(actor),
      plainToken,
    );
    return { ok: true, expiresAt: expiresAt.toISOString() };
  }

  async acceptInvitation(dto: AcceptTrainerInvitationDto) {
    const tokenHash = await hashToken(dto.token);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
    });
    if (
      !invitation ||
      invitation.role !== UserRole.trainer ||
      invitation.status !== InvitationStatus.pending ||
      invitation.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        'This trainer invitation is invalid or has expired.',
      );
    }
    const trainer = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });
    if (
      !trainer ||
      trainer.role !== UserRole.trainer ||
      trainer.status !== UserStatus.pending
    ) {
      throw new BadRequestException(
        'This trainer invitation can no longer be accepted.',
      );
    }

    const passwordHash = await hashPassword(dto.password);
    const now = new Date();
    const activated = await this.audit.capture(
      {
        action: 'trainers.invitation.accepted',
        entityType: 'trainerUser',
        entityId: () => trainer.id,
        summary: `${this.displayName(trainer)} accepted a trainer invitation`,
      },
      async (tx) => {
        const user = await tx.user.update({
          where: { id: trainer.id },
          data: {
            passwordHash,
            status: UserStatus.active,
            emailVerifiedAt: now,
            ...(dto.timezone ? { timezone: dto.timezone.trim() } : {}),
          },
        });
        await tx.trainerCapability.update({
          where: { userId: trainer.id },
          data: { status: TrainerCapabilityStatus.active },
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
            role: UserRole.trainer,
            status: InvitationStatus.pending,
            id: { not: invitation.id },
          },
          data: {
            status: InvitationStatus.revoked,
            revokedAt: now,
          },
        });
        return user;
      },
    );
    await this.email.sendWelcome(activated.email, this.displayName(activated));
    return this.trainers.getTrainer(activated, activated.id);
  }

  async update(
    actor: User,
    trainerUserId: string,
    dto: UpdateTrainerDto,
  ) {
    const trainer = await this.findTrainer(trainerUserId);
    await this.validateCapability(dto);
    await this.audit.capture(
      {
        action: 'trainers.profile.updated',
        entityType: 'trainerUser',
        entityId: () => trainer.id,
        summary: `Updated trainer ${this.displayName(trainer)}`,
        payload: {
          roleLabel: dto.roleLabel,
          accessLevel: dto.accessLevel,
          sectorIds: dto.sectorIds,
        },
      },
      async (tx) => {
        await tx.user.update({
          where: { id: trainer.id },
          data: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone?.trim() || null,
          },
        });
        await tx.trainerCapability.upsert({
          where: { userId: trainer.id },
          create: {
            userId: trainer.id,
            roleLabel: dto.roleLabel,
            accessLevel: dto.accessLevel,
            accessExpiresOn: this.accessExpiry(dto),
            status:
              trainer.status === UserStatus.active
                ? TrainerCapabilityStatus.active
                : TrainerCapabilityStatus.inactive,
          },
          update: {
            roleLabel: dto.roleLabel,
            accessLevel: dto.accessLevel,
            accessExpiresOn: this.accessExpiry(dto),
          },
        });
        await tx.trainerSpecialism.deleteMany({
          where: { userId: trainer.id },
        });
        if (dto.sectorIds.length) {
          await tx.trainerSpecialism.createMany({
            data: dto.sectorIds.map((sectorId) => ({
              userId: trainer.id,
              sectorId,
            })),
          });
        }
        return { id: trainer.id };
      },
    );
    return this.trainers.getTrainer(actor, trainer.id);
  }

  async updateStatus(
    actor: User,
    trainerUserId: string,
    dto: UpdateTrainerStatusDto,
  ) {
    const trainer = await this.findTrainer(trainerUserId);
    if (trainer.status === UserStatus.pending) {
      throw new BadRequestException(
        'Pending invitations cannot be activated or disabled manually.',
      );
    }
    const userStatus =
      dto.status === TrainerCapabilityStatus.active
        ? UserStatus.active
        : UserStatus.inactive;
    await this.audit.capture(
      {
        action: 'trainers.status.updated',
        entityType: 'trainerUser',
        entityId: () => trainer.id,
        summary: `Updated trainer status to ${dto.status}`,
        payload: {
          previousStatus: trainer.status,
          nextStatus: userStatus,
        },
      },
      async (tx) => {
        await tx.user.update({
          where: { id: trainer.id },
          data: { status: userStatus },
        });
        await tx.trainerCapability.upsert({
          where: { userId: trainer.id },
          create: { userId: trainer.id, status: dto.status },
          update: { status: dto.status },
        });
        return { id: trainer.id };
      },
    );
    return this.trainers.getTrainer(actor, trainer.id);
  }
  myProfile(user: User) {
    return this.trainers.getTrainer(user, user.id);
  }

  async updateMyProfile(user: User, dto: UpdateTrainerProfileDto) {
    const trainer = await this.findTrainer(user.id);
    const updated = await this.audit.capture(
      {
        action: 'trainers.self-profile.updated',
        entityType: 'trainerUser',
        entityId: () => trainer.id,
        summary: 'Updated trainer profile',
      },
      (tx) =>
        tx.user.update({
          where: { id: trainer.id },
          data: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone?.trim() || null,
            timezone: dto.timezone.trim(),
          },
        }),
    );
    return this.trainers.getTrainer(updated, updated.id);
  }

  private async validateCapability(dto: TrainerCapabilityDto) {
    if (
      dto.accessLevel === TrainerAccessLevel.guest &&
      (!dto.accessExpiresOn || new Date(dto.accessExpiresOn) <= new Date())
    ) {
      throw new BadRequestException(
        'Guest trainer access must expire on a future date.',
      );
    }
    if (!dto.sectorIds.length) return;
    const count = await this.prisma.sector.count({
      where: { id: { in: dto.sectorIds }, active: true },
    });
    if (count !== dto.sectorIds.length) {
      throw new BadRequestException(
        'One or more trainer specialisms are invalid or inactive.',
      );
    }
  }

  private accessExpiry(dto: TrainerCapabilityDto) {
    return dto.accessLevel === TrainerAccessLevel.guest && dto.accessExpiresOn
      ? new Date(dto.accessExpiresOn)
      : null;
  }

  private findTrainer(id: string) {
    return this.prisma.user.findFirst({
      where: { id, role: UserRole.trainer },
    }).then((trainer) => {
      if (!trainer) throw new NotFoundException('Trainer was not found.');
      return trainer;
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
