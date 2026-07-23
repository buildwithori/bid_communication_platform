import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessMembership, Prisma, User, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PLATFORM_DEFAULT_TIMEZONE } from '../common/constants/platform.constants';
import { PrismaService } from '../database/prisma.service';
import { EntrepreneurQueryDto } from './dto/entrepreneur-query.dto';
import { ProfileRecordQueryDto, ProgrammeAccessQueryDto } from './dto/profile-record-query.dto';
import { UpsertFundraisingRoundDto, UpsertPeriodicUpdateDto, UpsertProgrammeGoalDto } from './dto/profile-records.dto';

const DEFAULT_TAKE = 20;

type EntrepreneurMembership = BusinessMembership & {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    timezone: string | null;
    status: string;
    createdAt: Date;
    entrepreneurProgrammeGrants: Array<{
      id: string;
      grantedAt: Date;
      programme: {
        id: string;
        name: string;
        accessType: string;
        startDate: Date;
        endDate: Date;
      };
    }>;
    _count: { entrepreneurProgrammeGrants: number };
  };
  business: {
    id: string;
    name: string;
    country: string;
    source: string;
    status: string;
    onboardingCompletedAt: Date | null;
    createdAt: Date;
    sector: { id: string; name: string; key: string } | null;
    stage: { id: string; name: string; key: string; definition: string } | null;
  };
};

@Injectable()
export class EntrepreneursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listEntrepreneurs(user: User, query: EntrepreneurQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const programmeAccessType = query.programmeId
      ? await this.readableProgrammeAccessType(user, query.programmeId)
      : undefined;
    const where = this.buildMembershipWhere(user, query, programmeAccessType);
    const [rows, totalItems] =
      await this.prisma.$transaction([
        this.prisma.businessMembership.findMany({
          where,
          orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
          take: take + 1,
          ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
          include: this.membershipInclude(user),
        }),
        this.prisma.businessMembership.count({ where }),
      ]);

    const visibleRows = rows.slice(0, take);
    const [progress, settings] = await Promise.all([
      this.progressAggregates(visibleRows.map((row) => row.user.id), user),
      this.getDefaultTimezone(),
    ]);
    return {
      items: visibleRows.map((row) =>
        this.mapEntrepreneur(row, progress.get(row.user.id), settings),
      ),
      nextCursor:
        rows.length > take
          ? visibleRows[visibleRows.length - 1]?.id ?? null
          : null,
      totalItems,
    };
  }

  async summary(user: User) {
    const baseWhere = this.buildMembershipWhere(user, {});
    const [totalEntrepreneurs, activeEntrepreneurs, withProgrammes, learnerImpact] =
      await Promise.all([
        this.prisma.businessMembership.count({ where: baseWhere }),
        this.prisma.businessMembership.count({
          where: {
            AND: [
              baseWhere,
              { business: { status: 'active' }, user: { status: 'active' } },
            ],
          },
        }),
        this.prisma.businessMembership.count({
          where: {
            AND: [
              baseWhere,
              {
                user: {
                  entrepreneurProgrammeGrants: {
                    some: { revokedAt: null },
                  },
                },
              },
            ],
          },
        }),
        this.learnerImpactSummary(user, baseWhere),
      ]);
    return {
      totalEntrepreneurs,
      activeEntrepreneurs,
      unassignedEntrepreneurs: totalEntrepreneurs - withProgrammes,
      withProgrammes,
      learnerImpact,
    };
  }

  async getEntrepreneur(user: User, entrepreneurUserId: string) {
    const membership = await this.prisma.businessMembership.findFirst({
      where: {
        ...this.buildMembershipWhere(user, {}),
        userId: entrepreneurUserId,
      },
      include: this.membershipInclude(user),
    });

    if (!membership) {
      throw new NotFoundException('Entrepreneur was not found.');
    }

    const [progress, timezone] = await Promise.all([
      this.progressAggregates([membership.user.id], user),
      this.getDefaultTimezone(),
    ]);
    return this.mapEntrepreneur(membership, progress.get(membership.user.id), timezone);
  }

  async listProgrammeAccess(
    user: User,
    entrepreneurUserId: string,
    query: ProgrammeAccessQueryDto,
  ) {
    await this.assertCanReadEntrepreneur(user, entrepreneurUserId);
    const take = query.take ?? DEFAULT_TAKE;
    const now = new Date();
    const where: Prisma.ProgrammeAccessGrantWhereInput = {
      entrepreneurUserId,
      revokedAt: null,
      AND: [
        ...(user.role === UserRole.trainer
          ? [
              {
                programme: {
                  modules: {
                    some: {
                      module: {
                        contentItems: {
                          some: { contentItem: { trainerId: user.id } },
                        },
                      },
                    },
                  },
                },
              },
            ]
          : []),
        ...(query.search?.trim()
          ? [
              {
                programme: {
                  name: {
                    contains: query.search.trim(),
                    mode: "insensitive" as const,
                  },
                },
              },
            ]
          : []),
        ...(query.selectableOnly
          ? [
              {
                programme: {
                  archivedAt: null,
                  publishedAt: { not: null },
                  startDate: { lte: now },
                },
              },
            ]
          : []),
      ],
    };
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.programmeAccessGrant.findMany({
        where,
        orderBy: [{ grantedAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          grantedAt: true,
          programme: {
            select: {
              id: true,
              name: true,
              accessType: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      }),
      this.prisma.programmeAccessGrant.count({ where }),
    ]);
    const visibleRows = rows.slice(0, take);
    const progress = await this.prisma.learnerProgrammeProgress.findMany({
      where: {
        entrepreneurUserId,
        programmeId: { in: visibleRows.map((row) => row.programme.id) },
      },
    });
    const progressByProgramme = new Map(progress.map((item) => [item.programmeId, item]));

    return {
      items: visibleRows.map((row) =>
        this.mapProgrammeAccess(row, progressByProgramme.get(row.programme.id)),
      ),
      nextCursor:
        rows.length > take
          ? visibleRows[visibleRows.length - 1]?.id ?? null
          : null,
      totalItems,
    };
  }

  async listProgrammeGoals(
    user: User,
    entrepreneurUserId: string,
    query: ProfileRecordQueryDto,
  ) {
    await this.assertCanReadEntrepreneur(user, entrepreneurUserId);
    const take = query.take ?? DEFAULT_TAKE;
    const filters: Prisma.ProgrammeGoalWhereInput[] = [];
    if (query.linkableOnly) {
      const now = new Date();
      filters.push({
        milestoneAchieved: false,
        OR: [
          { programmeId: null },
          {
            programme: {
              is: {
                archivedAt: null,
                publishedAt: { not: null },
                startDate: { lte: now },
              },
            },
          },
        ],
      });
    }
    if (query.search?.trim()) {
      filters.push({
        OR: [
          { description: { contains: query.search.trim(), mode: 'insensitive' } },
          { goalType: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
          { programme: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
        ],
      });
    }
    const where: Prisma.ProgrammeGoalWhereInput = {
      entrepreneurUserId,
      ...(query.programmeId ? { programmeId: query.programmeId } : {}),
      ...(filters.length ? { AND: filters } : {}),
    };
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.programmeGoal.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: this.programmeGoalInclude(),
      }),
      this.prisma.programmeGoal.count({ where }),
    ]);
    const items = rows.slice(0, take);
    return {
      items: items.map((goal) => this.mapProgrammeGoal(goal)),
      nextCursor: rows.length > take ? items[items.length - 1]?.id ?? null : null,
      totalItems,
    };
  }

  async listFundraisingRounds(
    user: User,
    entrepreneurUserId: string,
    query: ProfileRecordQueryDto,
  ) {
    await this.assertCanReadEntrepreneur(user, entrepreneurUserId);
    const take = query.take ?? DEFAULT_TAKE;
    const where: Prisma.FundraisingRoundWhereInput = {
      entrepreneurUserId,
      ...(query.programmeId ? { programmeId: query.programmeId } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { name: { contains: query.search.trim(), mode: 'insensitive' } },
              { source: { contains: query.search.trim(), mode: 'insensitive' } },
              { currency: { contains: query.search.trim(), mode: 'insensitive' } },
              { programme: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.fundraisingRound.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: this.fundraisingRoundInclude(),
      }),
      this.prisma.fundraisingRound.count({ where }),
    ]);
    const items = rows.slice(0, take);
    return {
      items: items.map((round) => this.mapFundraisingRound(round)),
      nextCursor: rows.length > take ? items[items.length - 1]?.id ?? null : null,
      totalItems,
    };
  }

  async listPeriodicUpdates(
    user: User,
    entrepreneurUserId: string,
    query: ProfileRecordQueryDto,
  ) {
    await this.assertCanReadEntrepreneur(user, entrepreneurUserId);
    const take = query.take ?? DEFAULT_TAKE;
    const where: Prisma.PeriodicUpdateWhereInput = {
      entrepreneurUserId,
      ...(query.programmeId ? { programmeId: query.programmeId } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { notes: { contains: query.search.trim(), mode: 'insensitive' } },
              { programme: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.periodicUpdate.findMany({
        where,
        orderBy: [{ periodEnd: 'desc' }, { id: 'desc' }],
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: this.periodicUpdateInclude(),
      }),
      this.prisma.periodicUpdate.count({ where }),
    ]);
    const items = rows.slice(0, take);
    return {
      items: items.map((update) => this.mapPeriodicUpdate(update)),
      nextCursor: rows.length > take ? items[items.length - 1]?.id ?? null : null,
      totalItems,
    };
  }

  async createProgrammeGoal(user: User, entrepreneurUserId: string, dto: UpsertProgrammeGoalDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.validateProgrammeGoal(entrepreneurUserId, dto);
    const goal = await this.audit.capture(
      {
        action: 'entrepreneurs.programme-goal.created',
        entityType: 'programmeGoal',
        entityId: (result) => result.id,
        summary: 'Created entrepreneur programme goal',
        payload: { entrepreneurUserId, programmeId: dto.programmeId ?? null },
      },
      (tx) =>
        tx.programmeGoal.create({
          data: {
            entrepreneurUserId,
            programmeId: dto.programmeId || null,
            goalTypeId: dto.goalTypeId,
            targetAmountCents: dto.targetAmountCents ?? null,
            description: this.optionalText(dto.description),
            milestoneAchieved: dto.milestoneAchieved ?? false,
          },
          include: this.programmeGoalInclude(),
        }),
    );
    return this.mapProgrammeGoal(goal);
  }

  async updateProgrammeGoal(user: User, entrepreneurUserId: string, goalId: string, dto: UpsertProgrammeGoalDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.ensureProgrammeGoalBelongsToEntrepreneur(goalId, entrepreneurUserId);
    await this.validateProgrammeGoal(entrepreneurUserId, dto);
    const goal = await this.audit.capture(
      {
        action: 'entrepreneurs.programme-goal.updated',
        entityType: 'programmeGoal',
        entityId: (result) => result.id,
        summary: 'Updated entrepreneur programme goal',
        payload: { entrepreneurUserId, programmeId: dto.programmeId ?? null },
      },
      (tx) =>
        tx.programmeGoal.update({
          where: { id: goalId },
          data: {
            programmeId: dto.programmeId || null,
            goalTypeId: dto.goalTypeId,
            targetAmountCents: dto.targetAmountCents ?? null,
            description: this.optionalText(dto.description),
            milestoneAchieved: dto.milestoneAchieved ?? false,
          },
          include: this.programmeGoalInclude(),
        }),
    );
    return this.mapProgrammeGoal(goal);
  }

  async createFundraisingRound(user: User, entrepreneurUserId: string, dto: UpsertFundraisingRoundDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.validateFundraisingRound(entrepreneurUserId, dto);
    const round = await this.audit.capture(
      {
        action: 'entrepreneurs.fundraising-round.created',
        entityType: 'fundraisingRound',
        entityId: (result) => result.id,
        summary: (result) => `Created fundraising round ${result.name ?? ''}`.trim(),
        payload: { entrepreneurUserId, programmeId: dto.programmeId ?? null },
      },
      (tx) =>
        tx.fundraisingRound.create({
          data: {
            entrepreneurUserId,
            programmeId: dto.programmeId || null,
            programmeGoalId: dto.programmeGoalId || null,
            name: dto.name.trim(),
            amountCents: dto.amountCents,
            currency: (dto.currency || 'USD').trim().toUpperCase(),
            source: this.optionalText(dto.source),
            date: new Date(dto.date),
          },
          include: this.fundraisingRoundInclude(),
        }),
    );
    return this.mapFundraisingRound(round);
  }

  async updateFundraisingRound(user: User, entrepreneurUserId: string, roundId: string, dto: UpsertFundraisingRoundDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.ensureFundraisingRoundBelongsToEntrepreneur(roundId, entrepreneurUserId);
    await this.validateFundraisingRound(entrepreneurUserId, dto);
    const round = await this.audit.capture(
      {
        action: 'entrepreneurs.fundraising-round.updated',
        entityType: 'fundraisingRound',
        entityId: (result) => result.id,
        summary: (result) => `Updated fundraising round ${result.name ?? ''}`.trim(),
        payload: { entrepreneurUserId, programmeId: dto.programmeId ?? null },
      },
      (tx) =>
        tx.fundraisingRound.update({
          where: { id: roundId },
          data: {
            programmeId: dto.programmeId || null,
            programmeGoalId: dto.programmeGoalId || null,
            name: dto.name.trim(),
            amountCents: dto.amountCents,
            currency: (dto.currency || 'USD').trim().toUpperCase(),
            source: this.optionalText(dto.source),
            date: new Date(dto.date),
          },
          include: this.fundraisingRoundInclude(),
        }),
    );
    return this.mapFundraisingRound(round);
  }

  async createPeriodicUpdate(user: User, entrepreneurUserId: string, dto: UpsertPeriodicUpdateDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.validatePeriodicUpdate(entrepreneurUserId, dto);
    const update = await this.audit.capture(
      {
        action: 'entrepreneurs.periodic-update.created',
        entityType: 'periodicUpdate',
        entityId: (result) => result.id,
        summary: 'Created entrepreneur periodic update',
        payload: { entrepreneurUserId, programmeId: dto.programmeId ?? null },
      },
      (tx) =>
        tx.periodicUpdate.create({
          data: {
            entrepreneurUserId,
            programmeId: dto.programmeId || null,
            periodStart: new Date(dto.periodStart),
            periodEnd: new Date(dto.periodEnd),
            jobsCreated: dto.jobsCreated,
            jobsWomen: dto.jobsWomen,
            jobsMen: dto.jobsMen,
            notes: this.optionalText(dto.notes),
          },
          include: this.periodicUpdateInclude(),
        }),
    );
    return this.mapPeriodicUpdate(update);
  }

  async updatePeriodicUpdate(user: User, entrepreneurUserId: string, updateId: string, dto: UpsertPeriodicUpdateDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.ensurePeriodicUpdateBelongsToEntrepreneur(updateId, entrepreneurUserId);
    await this.validatePeriodicUpdate(entrepreneurUserId, dto);
    const update = await this.audit.capture(
      {
        action: 'entrepreneurs.periodic-update.updated',
        entityType: 'periodicUpdate',
        entityId: (result) => result.id,
        summary: 'Updated entrepreneur periodic update',
        payload: { entrepreneurUserId, programmeId: dto.programmeId ?? null },
      },
      (tx) =>
        tx.periodicUpdate.update({
          where: { id: updateId },
          data: {
            programmeId: dto.programmeId || null,
            periodStart: new Date(dto.periodStart),
            periodEnd: new Date(dto.periodEnd),
            jobsCreated: dto.jobsCreated,
            jobsWomen: dto.jobsWomen,
            jobsMen: dto.jobsMen,
            notes: this.optionalText(dto.notes),
          },
          include: this.periodicUpdateInclude(),
        }),
    );
    return this.mapPeriodicUpdate(update);
  }

  private buildMembershipWhere(
    user: User,
    query: EntrepreneurQueryDto,
    programmeAccessType?: 'free' | 'assigned',
  ): Prisma.BusinessMembershipWhereInput {
    const filters: Prisma.BusinessMembershipWhereInput[] = [
      { isPrimary: true, user: { role: UserRole.entrepreneur } },
    ];

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { phone: { contains: search, mode: 'insensitive' } } },
          { business: { name: { contains: search, mode: 'insensitive' } } },
          { business: { country: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (query.sectorId) filters.push({ business: { sectorId: query.sectorId } });
    if (query.stageId) filters.push({ business: { stageId: query.stageId } });
    if (query.status === 'invited') {
      filters.push({ user: { status: 'pending' } });
    } else if (query.status) {
      filters.push({
        business: { status: query.status },
        ...(query.status === 'active' ? { user: { status: 'active' } } : {}),
      });
    }
    if (query.source) filters.push({ business: { source: query.source } });
    if (query.programmeAccess === 'without_programme') {
      filters.push({
        user: {
          entrepreneurProgrammeGrants: { none: { revokedAt: null } },
        },
      });
    } else if (query.programmeAccess === 'with_programme') {
      filters.push({
        user: {
          entrepreneurProgrammeGrants: { some: { revokedAt: null } },
        },
      });
    }
    if (query.programmeId && programmeAccessType === 'assigned') {
      filters.push({
        user: {
          entrepreneurProgrammeGrants: {
            some: { programmeId: query.programmeId, revokedAt: null },
          },
        },
      });
    }
    if (
      query.programmeId &&
      programmeAccessType === 'free' &&
      user.role === UserRole.trainer
    ) {
      filters.push({
        user: {
          programmeProgress: { some: { programmeId: query.programmeId } },
        },
      });
    }

    const scopeWhere = this.scopeWhere(user);
    if (scopeWhere) filters.push(scopeWhere);

    return { AND: filters };
  }

  private async readableProgrammeAccessType(user: User, programmeId: string) {
    const programme = await this.prisma.programme.findFirst({
      where: {
        id: programmeId,
        ...(user.role === UserRole.admin
          ? {}
          : user.role === UserRole.entrepreneur
            ? {
                OR: [
                  { accessType: 'free' },
                  {
                    accessGrants: {
                      some: { entrepreneurUserId: user.id, revokedAt: null },
                    },
                  },
                ],
              }
            : {
                modules: {
                  some: {
                    module: {
                      contentItems: {
                        some: { contentItem: { trainerId: user.id } },
                      },
                    },
                  },
                },
              }),
      },
      select: { accessType: true },
    });

    if (!programme) {
      throw new ForbiddenException(
        'You do not have access to this programme.',
      );
    }
    return programme.accessType;
  }

  private scopeWhere(user: User): Prisma.BusinessMembershipWhereInput | null {
    if (user.role === UserRole.admin) return null;
    if (user.role === UserRole.entrepreneur) return { userId: user.id };

    const trainerProgramme = {
      modules: {
        some: {
          module: {
            contentItems: {
              some: { contentItem: { trainerId: user.id } },
            },
          },
        },
      },
    };
    return {
      user: {
        OR: [
          {
            entrepreneurProgrammeGrants: {
              some: { revokedAt: null, programme: trainerProgramme },
            },
          },
          {
            programmeProgress: {
              some: { programme: trainerProgramme },
            },
          },
        ],
      },
    };
  }

  private async assertCanReadEntrepreneur(user: User, entrepreneurUserId: string) {
    if (user.role === UserRole.admin) return;
    if (user.role === UserRole.entrepreneur && user.id === entrepreneurUserId) return;

    if (user.role === UserRole.trainer) {
      const membership = await this.prisma.businessMembership.findFirst({
        where: {
          ...this.buildMembershipWhere(user, {}),
          userId: entrepreneurUserId,
        },
        select: { id: true },
      });
      if (membership) return;
    }

    throw new ForbiddenException('You do not have access to this entrepreneur.');
  }

  private async assertCanWriteEntrepreneur(user: User, entrepreneurUserId: string) {
    if (user.role === UserRole.admin) return;
    if (user.role === UserRole.entrepreneur && user.id === entrepreneurUserId) return;
    throw new ForbiddenException('You cannot update this entrepreneur profile.');
  }

  private async validateProgrammeGoal(entrepreneurUserId: string, dto: UpsertProgrammeGoalDto) {
    const goalType = await this.prisma.programmeGoalType.findFirst({
      where: { id: dto.goalTypeId, active: true },
      select: { id: true, requiresTargetAmount: true },
    });
    if (!goalType) throw new BadRequestException('Select a valid active goal type.');
    if (goalType.requiresTargetAmount && !dto.targetAmountCents) {
      throw new BadRequestException('This goal type requires a target amount.');
    }
    await this.assertProgrammeAccess(entrepreneurUserId, dto.programmeId || null);
  }

  private async validateFundraisingRound(entrepreneurUserId: string, dto: UpsertFundraisingRoundDto) {
    await this.assertProgrammeAccess(entrepreneurUserId, dto.programmeId || null);

    if (dto.programmeGoalId) {
      const goal = await this.prisma.programmeGoal.findFirst({
        where: { id: dto.programmeGoalId, entrepreneurUserId },
        select: {
          id: true,
          programmeId: true,
          milestoneAchieved: true,
          programme: {
            select: { archivedAt: true, publishedAt: true, startDate: true },
          },
        },
      });
      if (!goal) throw new BadRequestException('Select a valid goal owned by this entrepreneur.');
      if (goal.milestoneAchieved) {
        throw new BadRequestException('An achieved goal cannot be linked to a fundraising round.');
      }
      if (goal.programme?.archivedAt) {
        throw new BadRequestException('A goal from an archived programme cannot be linked to a fundraising round.');
      }
      if (
        goal.programme &&
        (!goal.programme.publishedAt || goal.programme.startDate > new Date())
      ) {
        throw new BadRequestException('A goal from a scheduled programme cannot be linked to a fundraising round.');
      }
      if (goal.programmeId && dto.programmeId && goal.programmeId !== dto.programmeId) {
        throw new BadRequestException('The linked goal belongs to a different programme.');
      }
    }
  }

  private async validatePeriodicUpdate(entrepreneurUserId: string, dto: UpsertPeriodicUpdateDto) {
    const start = new Date(dto.periodStart);
    const end = new Date(dto.periodEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw new BadRequestException('Select a valid reporting period.');
    }
    if (dto.jobsWomen + dto.jobsMen > dto.jobsCreated) {
      throw new BadRequestException('Women and men job counts cannot exceed total jobs created.');
    }
    await this.assertProgrammeAccess(entrepreneurUserId, dto.programmeId || null);
  }

  private async assertProgrammeAccess(entrepreneurUserId: string, programmeId: string | null) {
    if (!programmeId) return;

    const programme = await this.prisma.programme.findFirst({
      where: {
        id: programmeId,
        archivedAt: null,
        publishedAt: { not: null },
        startDate: { lte: new Date() },
        OR: [
          { accessType: 'free' },
          { accessGrants: { some: { entrepreneurUserId, revokedAt: null } } },
        ],
      },
      select: { id: true },
    });

    if (!programme) {
      throw new BadRequestException(
        'Select a started programme available to this entrepreneur.',
      );
    }
  }

  private async ensureProgrammeGoalBelongsToEntrepreneur(id: string, entrepreneurUserId: string) {
    const goal = await this.prisma.programmeGoal.findFirst({ where: { id, entrepreneurUserId }, select: { id: true } });
    if (!goal) throw new NotFoundException('Programme goal was not found.');
  }

  private async ensureFundraisingRoundBelongsToEntrepreneur(id: string, entrepreneurUserId: string) {
    const round = await this.prisma.fundraisingRound.findFirst({ where: { id, entrepreneurUserId }, select: { id: true } });
    if (!round) throw new NotFoundException('Fundraising round was not found.');
  }

  private async ensurePeriodicUpdateBelongsToEntrepreneur(id: string, entrepreneurUserId: string) {
    const update = await this.prisma.periodicUpdate.findFirst({ where: { id, entrepreneurUserId }, select: { id: true } });
    if (!update) throw new NotFoundException('Periodic update was not found.');
  }

  private programmeGoalInclude() {
    return {
      programme: {
        select: {
          id: true,
          name: true,
          archivedAt: true,
          publishedAt: true,
          startDate: true,
        },
      },
      goalType: { select: { id: true, name: true, key: true, requiresTargetAmount: true } },
    } satisfies Prisma.ProgrammeGoalInclude;
  }

  private fundraisingRoundInclude() {
    return {
      programme: {
        select: {
          id: true,
          name: true,
          archivedAt: true,
          publishedAt: true,
          startDate: true,
        },
      },
      programmeGoal: {
        select: {
          id: true,
          description: true,
          milestoneAchieved: true,
          programme: {
            select: { archivedAt: true, publishedAt: true, startDate: true },
          },
          goalType: { select: { id: true, name: true, key: true } },
        },
      },
    } satisfies Prisma.FundraisingRoundInclude;
  }

  private periodicUpdateInclude() {
    return {
      programme: {
        select: {
          id: true,
          name: true,
          archivedAt: true,
          publishedAt: true,
          startDate: true,
        },
      },
    } satisfies Prisma.PeriodicUpdateInclude;
  }

  private membershipInclude(user: User) {
    const trainerProgrammeWhere =
      user.role === UserRole.trainer
        ? {
            programme: {
              modules: {
                some: {
                  module: {
                    contentItems: {
                      some: { contentItem: { trainerId: user.id } },
                    },
                  },
                },
              },
            },
          }
        : {};
    return {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          timezone: true,
          status: true,
          createdAt: true,
          entrepreneurProgrammeGrants: {
            where: { revokedAt: null, ...trainerProgrammeWhere },
            orderBy: { grantedAt: 'desc' as const },
            take: 3,
            select: {
              id: true,
              grantedAt: true,
              programme: {
                select: {
                  id: true,
                  name: true,
                  accessType: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          },
          _count: {
            select: {
              entrepreneurProgrammeGrants: {
                where: { revokedAt: null, ...trainerProgrammeWhere },
              },
            },
          },
        },
      },
      business: {
        select: {
          id: true,
          name: true,
          country: true,
          source: true,
          status: true,
          onboardingCompletedAt: true,
          createdAt: true,
          sector: { select: { id: true, name: true, key: true } },
          stage: { select: { id: true, name: true, key: true, definition: true } },
        },
      },
    } satisfies Prisma.BusinessMembershipInclude;
  }

  private mapProgrammeGoal(goal: Prisma.ProgrammeGoalGetPayload<{ include: ReturnType<EntrepreneursService['programmeGoalInclude']> }>) {
    return {
      id: goal.id,
      entrepreneurUserId: goal.entrepreneurUserId,
      programme: this.mapRecordProgramme(goal.programme),
      goalType: goal.goalType,
      targetAmountCents: goal.targetAmountCents,
      description: goal.description,
      milestoneAchieved: goal.milestoneAchieved,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }

  private mapFundraisingRound(round: Prisma.FundraisingRoundGetPayload<{ include: ReturnType<EntrepreneursService['fundraisingRoundInclude']> }>) {
    return {
      id: round.id,
      entrepreneurUserId: round.entrepreneurUserId,
      programme: this.mapRecordProgramme(round.programme),
      programmeGoal: round.programmeGoal
        ? {
            id: round.programmeGoal.id,
            description: round.programmeGoal.description,
            goalType: round.programmeGoal.goalType,
            linkable:
              !round.programmeGoal.milestoneAchieved &&
              (!round.programmeGoal.programme ||
                (!round.programmeGoal.programme.archivedAt &&
                  Boolean(round.programmeGoal.programme.publishedAt) &&
                  round.programmeGoal.programme.startDate <= new Date())),
          }
        : null,
      name: round.name,
      amountCents: round.amountCents,
      currency: round.currency,
      source: round.source,
      date: round.date.toISOString(),
      createdAt: round.createdAt.toISOString(),
      updatedAt: round.updatedAt.toISOString(),
    };
  }

  private mapPeriodicUpdate(update: Prisma.PeriodicUpdateGetPayload<{ include: ReturnType<EntrepreneursService['periodicUpdateInclude']> }>) {
    return {
      id: update.id,
      entrepreneurUserId: update.entrepreneurUserId,
      programme: this.mapRecordProgramme(update.programme),
      periodStart: update.periodStart.toISOString(),
      periodEnd: update.periodEnd.toISOString(),
      submittedAt: update.submittedAt.toISOString(),
      jobsCreated: update.jobsCreated,
      jobsWomen: update.jobsWomen,
      jobsMen: update.jobsMen,
      notes: update.notes,
      createdAt: update.createdAt.toISOString(),
      updatedAt: update.updatedAt.toISOString(),
    };
  }

  private optionalText(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private mapRecordProgramme(
    programme: {
      id: string;
      name: string;
      archivedAt: Date | null;
      publishedAt: Date | null;
      startDate: Date;
    } | null,
  ) {
    if (!programme) return null;
    return {
      id: programme.id,
      name: programme.name,
      selectable:
        !programme.archivedAt &&
        Boolean(programme.publishedAt) &&
        programme.startDate <= new Date(),
    };
  }

  private mapProgrammeAccess(
    row: {
      id: string;
      grantedAt: Date;
      programme: {
        id: string;
        name: string;
        accessType: string;
        startDate: Date;
        endDate: Date;
      };
    },
    progress?: {
      status: string;
      progressPercent: number;
      completedModuleCount: number;
      totalModuleCount: number;
      completedContentCount: number;
      totalContentCount: number;
    },
  ) {
    return {
      grantId: row.id,
      id: row.programme.id,
      name: row.programme.name,
      accessType: row.programme.accessType,
      grantedAt: row.grantedAt.toISOString(),
      startDate: row.programme.startDate.toISOString(),
      endDate: row.programme.endDate.toISOString(),
      progress: progress
        ? {
            status: progress.status,
            percent: progress.progressPercent,
            completedModules: progress.completedModuleCount,
            totalModules: progress.totalModuleCount,
            completedContent: progress.completedContentCount,
            totalContent: progress.totalContentCount,
          }
        : null,
    };
  }

  private async progressAggregates(
    entrepreneurUserIds: string[],
    user: User,
  ) {
    if (!entrepreneurUserIds.length) {
      return new Map<string, { average: number; trackedProgrammes: number }>();
    }
    const rows = await this.prisma.learnerProgrammeProgress.groupBy({
      by: ['entrepreneurUserId'],
      where: {
        entrepreneurUserId: { in: entrepreneurUserIds },
        ...(user.role === UserRole.trainer
          ? {
              programme: {
                modules: {
                  some: {
                    module: {
                      contentItems: {
                        some: { contentItem: { trainerId: user.id } },
                      },
                    },
                  },
                },
              },
            }
          : {}),
      },
      _avg: { progressPercent: true },
      _count: { _all: true },
    });

    return new Map(
      rows.map((row) => [
        row.entrepreneurUserId,
        {
          average: Math.round(row._avg.progressPercent ?? 0),
          trackedProgrammes: row._count._all,
        },
      ]),
    );
  }

  private async learnerImpactSummary(
    user: User,
    membershipWhere: Prisma.BusinessMembershipWhereInput,
  ) {
    const entrepreneurScope = {
      businessMemberships: { some: membershipWhere },
    };
    const trainerProgrammeScope =
      user.role === UserRole.trainer
        ? {
            programme: {
              modules: {
                some: {
                  module: {
                    contentItems: {
                      some: { contentItem: { trainerId: user.id } },
                    },
                  },
                },
              },
            },
          }
        : {};
    const [programmeProgress, completedContent, ratings] = await Promise.all([
      this.prisma.learnerProgrammeProgress.aggregate({
        where: {
          entrepreneur: entrepreneurScope,
          ...trainerProgrammeScope,
        },
        _avg: { progressPercent: true },
        _count: { _all: true },
      }),
      this.prisma.learnerContentProgress.count({
        where: {
          entrepreneur: entrepreneurScope,
          status: "completed",
          ...(user.role === UserRole.trainer
            ? { contentItem: { trainerId: user.id } }
            : {}),
        },
      }),
      this.prisma.contentRating.aggregate({
        where: {
          entrepreneur: entrepreneurScope,
          ...(user.role === UserRole.trainer ? { trainerId: user.id } : {}),
        },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    return {
      averageProgrammeProgress: Math.round(
        programmeProgress._avg.progressPercent ?? 0,
      ),
      trackedProgrammeProgress: programmeProgress._count._all,
      completedContent,
      averageRating: Number((ratings._avg.rating ?? 0).toFixed(1)),
      ratingCount: ratings._count._all,
    };
  }

  private async getDefaultTimezone() {
    const settings = await this.prisma.companySettings.upsert({
      where: { singletonKey: 'default' }, update: {}, create: { singletonKey: 'default' },
      select: { defaultTimezone: true },
    });
    return settings.defaultTimezone || PLATFORM_DEFAULT_TIMEZONE;
  }

  private mapEntrepreneur(
    row: EntrepreneurMembership,
    learnerProgress = { average: 0, trackedProgrammes: 0 },
    defaultTimezone = PLATFORM_DEFAULT_TIMEZONE,
  ) {
    const programmes = row.user.entrepreneurProgrammeGrants.map((grant) =>
      this.mapProgrammeAccess(grant),
    );

    return {
      entrepreneurUserId: row.user.id,
      businessId: row.business.id,
      businessName: row.business.name,
      firstName: row.user.firstName ?? '',
      lastName: row.user.lastName ?? '',
      representativeName: [row.user.firstName, row.user.lastName].filter(Boolean).join(' ') || row.user.email,
      email: row.user.email,
      phone: row.user.phone,
      timezone: row.user.timezone ?? defaultTimezone,
      usesCompanyTimezone: row.user.timezone === null,
      country: row.business.country,
      status: row.business.status,
      source: row.business.source,
      userStatus: row.user.status,
      joinedAt: row.joinedAt.toISOString(),
      onboardingCompletedAt: row.business.onboardingCompletedAt?.toISOString() ?? null,
      sector: row.business.sector,
      stage: row.business.stage,
      programmeAccess: {
        freeResources: true,
        assignedProgrammes: programmes,
        assignedProgrammeCount: row.user._count.entrepreneurProgrammeGrants,
      },
      learnerProgress,
    };
  }
}
