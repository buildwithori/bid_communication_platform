import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessMembership, Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EntrepreneurQueryDto } from './dto/entrepreneur-query.dto';
import { UpsertFundraisingRoundDto, UpsertPeriodicUpdateDto, UpsertProgrammeGoalDto } from './dto/profile-records.dto';

const DEFAULT_TAKE = 20;

type EntrepreneurMembership = BusinessMembership & {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    status: string;
    createdAt: Date;
    entrepreneurProgrammeGrants: Array<{
      grantedAt: Date;
      programme: {
        id: string;
        name: string;
        accessType: string;
        startDate: Date;
        endDate: Date;
      };
    }>;
    programmeProgress: Array<{
      programmeId: string;
      status: string;
      progressPercent: number;
      completedModuleCount: number;
      totalModuleCount: number;
      completedContentCount: number;
      totalContentCount: number;
    }>;
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
  constructor(private readonly prisma: PrismaService) {}

  async listEntrepreneurs(user: User, query: EntrepreneurQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const rows = await this.prisma.businessMembership.findMany({
      where: this.buildMembershipWhere(user, query),
      orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: this.membershipInclude(),
    });

    const nextCursor = rows.length > take ? rows[take]?.id ?? null : null;
    const items = rows.slice(0, take).map((row) => this.mapEntrepreneur(row));

    return { items, nextCursor };
  }

  async getEntrepreneur(user: User, entrepreneurUserId: string) {
    const membership = await this.prisma.businessMembership.findFirst({
      where: {
        ...this.buildMembershipWhere(user, {}),
        userId: entrepreneurUserId,
      },
      include: this.membershipInclude(),
    });

    if (!membership) {
      throw new NotFoundException('Entrepreneur was not found.');
    }

    return this.mapEntrepreneur(membership);
  }

  async getProfileRecords(user: User, entrepreneurUserId: string) {
    await this.assertCanReadEntrepreneur(user, entrepreneurUserId);

    const [programmeGoals, fundraisingRounds, periodicUpdates] = await Promise.all([
      this.prisma.programmeGoal.findMany({
        where: { entrepreneurUserId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: this.programmeGoalInclude(),
      }),
      this.prisma.fundraisingRound.findMany({
        where: { entrepreneurUserId },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        include: this.fundraisingRoundInclude(),
      }),
      this.prisma.periodicUpdate.findMany({
        where: { entrepreneurUserId },
        orderBy: [{ periodEnd: 'desc' }, { id: 'desc' }],
        include: this.periodicUpdateInclude(),
      }),
    ]);

    return {
      programmeGoals: programmeGoals.map((goal) => this.mapProgrammeGoal(goal)),
      fundraisingRounds: fundraisingRounds.map((round) => this.mapFundraisingRound(round)),
      periodicUpdates: periodicUpdates.map((update) => this.mapPeriodicUpdate(update)),
    };
  }

  async createProgrammeGoal(user: User, entrepreneurUserId: string, dto: UpsertProgrammeGoalDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.validateProgrammeGoal(entrepreneurUserId, dto);

    const goal = await this.prisma.programmeGoal.create({
      data: {
        entrepreneurUserId,
        programmeId: dto.programmeId || null,
        goalTypeId: dto.goalTypeId,
        targetAmountCents: dto.targetAmountCents ?? null,
        description: this.optionalText(dto.description),
        evidence: this.optionalText(dto.evidence),
        milestoneAchieved: dto.milestoneAchieved ?? false,
      },
      include: this.programmeGoalInclude(),
    });

    return this.mapProgrammeGoal(goal);
  }

  async updateProgrammeGoal(user: User, entrepreneurUserId: string, goalId: string, dto: UpsertProgrammeGoalDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.ensureProgrammeGoalBelongsToEntrepreneur(goalId, entrepreneurUserId);
    await this.validateProgrammeGoal(entrepreneurUserId, dto);

    const goal = await this.prisma.programmeGoal.update({
      where: { id: goalId },
      data: {
        programmeId: dto.programmeId || null,
        goalTypeId: dto.goalTypeId,
        targetAmountCents: dto.targetAmountCents ?? null,
        description: this.optionalText(dto.description),
        evidence: this.optionalText(dto.evidence),
        milestoneAchieved: dto.milestoneAchieved ?? false,
      },
      include: this.programmeGoalInclude(),
    });

    return this.mapProgrammeGoal(goal);
  }

  async createFundraisingRound(user: User, entrepreneurUserId: string, dto: UpsertFundraisingRoundDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.validateFundraisingRound(entrepreneurUserId, dto);

    const round = await this.prisma.fundraisingRound.create({
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
    });

    return this.mapFundraisingRound(round);
  }

  async updateFundraisingRound(user: User, entrepreneurUserId: string, roundId: string, dto: UpsertFundraisingRoundDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.ensureFundraisingRoundBelongsToEntrepreneur(roundId, entrepreneurUserId);
    await this.validateFundraisingRound(entrepreneurUserId, dto);

    const round = await this.prisma.fundraisingRound.update({
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
    });

    return this.mapFundraisingRound(round);
  }

  async createPeriodicUpdate(user: User, entrepreneurUserId: string, dto: UpsertPeriodicUpdateDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.validatePeriodicUpdate(entrepreneurUserId, dto);

    const update = await this.prisma.periodicUpdate.create({
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
    });

    return this.mapPeriodicUpdate(update);
  }

  async updatePeriodicUpdate(user: User, entrepreneurUserId: string, updateId: string, dto: UpsertPeriodicUpdateDto) {
    await this.assertCanWriteEntrepreneur(user, entrepreneurUserId);
    await this.ensurePeriodicUpdateBelongsToEntrepreneur(updateId, entrepreneurUserId);
    await this.validatePeriodicUpdate(entrepreneurUserId, dto);

    const update = await this.prisma.periodicUpdate.update({
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
    });

    return this.mapPeriodicUpdate(update);
  }

  private buildMembershipWhere(user: User, query: EntrepreneurQueryDto): Prisma.BusinessMembershipWhereInput {
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
    if (query.status) filters.push({ business: { status: query.status } });
    if (query.source) filters.push({ business: { source: query.source } });

    const scopeWhere = this.scopeWhere(user);
    if (scopeWhere) filters.push(scopeWhere);

    return { AND: filters };
  }

  private scopeWhere(user: User): Prisma.BusinessMembershipWhereInput | null {
    if (user.role === UserRole.admin) return null;
    if (user.role === UserRole.entrepreneur) return { userId: user.id };

    return {
      user: {
        entrepreneurProgrammeGrants: {
          some: {
            revokedAt: null,
            programme: {
              modules: {
                some: {
                  module: {
                    contentItems: {
                      some: {
                        contentItem: {
                          trainerId: user.id,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
        select: { id: true, programmeId: true },
      });
      if (!goal) throw new BadRequestException('Select a valid goal owned by this entrepreneur.');
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
        OR: [
          { accessType: 'free' },
          { accessGrants: { some: { entrepreneurUserId, revokedAt: null } } },
        ],
      },
      select: { id: true },
    });

    if (!programme) {
      throw new BadRequestException('This entrepreneur does not have access to the selected programme.');
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
      programme: { select: { id: true, name: true } },
      goalType: { select: { id: true, name: true, key: true, requiresTargetAmount: true } },
    } satisfies Prisma.ProgrammeGoalInclude;
  }

  private fundraisingRoundInclude() {
    return {
      programme: { select: { id: true, name: true } },
      programmeGoal: {
        select: {
          id: true,
          description: true,
          goalType: { select: { id: true, name: true, key: true } },
        },
      },
    } satisfies Prisma.FundraisingRoundInclude;
  }

  private periodicUpdateInclude() {
    return {
      programme: { select: { id: true, name: true } },
    } satisfies Prisma.PeriodicUpdateInclude;
  }

  private membershipInclude() {
    return {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          createdAt: true,
          entrepreneurProgrammeGrants: {
            where: { revokedAt: null },
            orderBy: { grantedAt: 'desc' as const },
            select: {
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
          programmeProgress: {
            select: {
              programmeId: true,
              status: true,
              progressPercent: true,
              completedModuleCount: true,
              totalModuleCount: true,
              completedContentCount: true,
              totalContentCount: true,
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
      programme: goal.programme,
      goalType: goal.goalType,
      targetAmountCents: goal.targetAmountCents,
      description: goal.description,
      evidence: goal.evidence,
      milestoneAchieved: goal.milestoneAchieved,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }

  private mapFundraisingRound(round: Prisma.FundraisingRoundGetPayload<{ include: ReturnType<EntrepreneursService['fundraisingRoundInclude']> }>) {
    return {
      id: round.id,
      entrepreneurUserId: round.entrepreneurUserId,
      programme: round.programme,
      programmeGoal: round.programmeGoal,
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
      programme: update.programme,
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

  private mapEntrepreneur(row: EntrepreneurMembership) {
    const progressByProgramme = new Map(row.user.programmeProgress.map((progress) => [progress.programmeId, progress]));
    const programmes = row.user.entrepreneurProgrammeGrants.map((grant) => {
      const progress = progressByProgramme.get(grant.programme.id);
      return {
        id: grant.programme.id,
        name: grant.programme.name,
        accessType: grant.programme.accessType,
        grantedAt: grant.grantedAt.toISOString(),
        startDate: grant.programme.startDate.toISOString(),
        endDate: grant.programme.endDate.toISOString(),
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
    });

    const averageProgress = programmes.length
      ? Math.round(
          programmes.reduce((sum, programme) => sum + (programme.progress?.percent ?? 0), 0) / programmes.length,
        )
      : 0;

    return {
      entrepreneurUserId: row.user.id,
      businessId: row.business.id,
      businessName: row.business.name,
      representativeName: [row.user.firstName, row.user.lastName].filter(Boolean).join(' ') || row.user.email,
      email: row.user.email,
      phone: row.user.phone,
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
      },
      learnerProgress: {
        average: averageProgress,
        trackedProgrammes: programmes.filter((programme) => programme.progress).length,
      },
    };
  }
}
