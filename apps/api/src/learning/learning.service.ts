import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DeliverableDueType, DeliverableInstanceStatus, DeliverableRequiredScope, LearnerProgressStatus, Prisma, ProgrammeAccessType, ProgressSource, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { LearnerProgressQueryDto } from './dto/learner-progress-query.dto';
import { LearnerContentProgressInputDto, SyncLearnerProgressDto } from './dto/sync-learner-progress.dto';

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalogueSummary(user: User) {
    if (user.role !== UserRole.entrepreneur) {
      throw new ForbiddenException(
        'Only entrepreneurs have a training catalogue summary.',
      );
    }
    const programmeWhere: Prisma.ProgrammeWhereInput = {
      publishedAt: { not: null },
      archivedAt: null,
      OR: [
        { accessType: ProgrammeAccessType.free },
        {
          accessGrants: {
            some: { entrepreneurUserId: user.id, revokedAt: null },
          },
        },
      ],
    };
    const [total, free, assigned, inProgress, completed] = await Promise.all([
      this.prisma.programme.count({ where: programmeWhere }),
      this.prisma.programme.count({
        where: { AND: [programmeWhere, { accessType: ProgrammeAccessType.free }] },
      }),
      this.prisma.programme.count({
        where: {
          AND: [programmeWhere, { accessType: ProgrammeAccessType.assigned }],
        },
      }),
      this.prisma.learnerProgrammeProgress.count({
        where: {
          entrepreneurUserId: user.id,
          status: LearnerProgressStatus.in_progress,
          programme: programmeWhere,
        },
      }),
      this.prisma.learnerProgrammeProgress.count({
        where: {
          entrepreneurUserId: user.id,
          status: LearnerProgressStatus.completed,
          programme: programmeWhere,
        },
      }),
    ]);

    return {
      programmes: {
        total,
        free,
        assigned,
        inProgress,
        completed,
        notStarted: Math.max(total - inProgress - completed, 0),
      },
    };
  }

  async getProgress(user: User, query: LearnerProgressQueryDto) {
    if (query.contentItemId && !query.moduleId) {
      throw new BadRequestException(
        'moduleId is required when contentItemId is provided.',
      );
    }
    const entrepreneurUserId = await this.resolveProgressOwner(user, query);
    return this.progressPayload(entrepreneurUserId, query);
  }

  async syncProgress(user: User, input: SyncLearnerProgressDto) {
    if (user.role !== UserRole.entrepreneur) {
      throw new ForbiddenException('Only entrepreneurs can sync learner progress.');
    }

    return this.withSerializableRetry(async (tx) => {
      const touchedProgrammes = new Map<string, Set<string>>();
      let syncedItems = 0;

      for (const item of input.items) {
        const clientEventAt = this.clientEventDate(item.clientEventAt);
        this.validatePlaybackMetrics(item);
        await this.assertCanSyncContent(tx, user.id, item);
        const progressResult = await this.upsertContentProgress(
          tx,
          user.id,
          item,
          clientEventAt,
        );
        if (!progressResult.applied) continue;

        syncedItems += 1;
        if (!progressResult.aggregateChanged) continue;
        const moduleIds =
          touchedProgrammes.get(item.programmeId) ?? new Set<string>();
        moduleIds.add(item.moduleId);
        touchedProgrammes.set(item.programmeId, moduleIds);
      }

      for (const [programmeId, moduleIds] of touchedProgrammes) {
        await this.recomputeProgrammeProgress(
          tx,
          user.id,
          programmeId,
          moduleIds,
          new Date(),
        );
      }

      return {
        syncedItems,
        ignoredItems: input.items.length - syncedItems,
        programmeIds: [...touchedProgrammes.keys()],
      };
    });
  }

  private async withSerializableRetry<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (!retryable || attempt === 3) throw error;
      }
    }
    throw new ServiceUnavailableException(
      'Learner progress could not be saved after concurrent updates.',
    );
  }

  private clientEventDate(value: string) {
    const clientEventAt = new Date(value);
    if (clientEventAt.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new BadRequestException(
        'Progress event time cannot be more than five minutes in the future.',
      );
    }
    return clientEventAt;
  }

  private validatePlaybackMetrics(item: LearnerContentProgressInputDto) {
    if (
      item.lastPositionSeconds !== undefined &&
      item.durationSeconds !== undefined &&
      item.lastPositionSeconds > item.durationSeconds
    ) {
      throw new BadRequestException(
        'Playback position cannot be greater than the content duration.',
      );
    }
  }

  private async resolveProgressOwner(user: User, query: LearnerProgressQueryDto) {
    if (user.role === UserRole.entrepreneur) {
      if (query.entrepreneurUserId && query.entrepreneurUserId !== user.id) {
        throw new ForbiddenException('You can only read your own learner progress.');
      }
      return user.id;
    }

    if (!query.entrepreneurUserId) {
      throw new BadRequestException('entrepreneurUserId is required for this role.');
    }

    if (user.role === UserRole.trainer) {
      const canRead = await this.trainerCanReadEntrepreneurProgress(
        user.id,
        query.entrepreneurUserId,
        query.programmeId,
      );
      if (!canRead) {
        throw new ForbiddenException('You do not have access to this learner progress.');
      }
    }

    return query.entrepreneurUserId;
  }

  private async trainerCanReadEntrepreneurProgress(
    trainerUserId: string,
    entrepreneurUserId: string,
    programmeId: string,
  ) {
    const programme = await this.prisma.programme.findFirst({
      where: {
        id: programmeId,
        OR: [
          { accessType: ProgrammeAccessType.free },
          {
            accessGrants: {
              some: { entrepreneurUserId, revokedAt: null },
            },
          },
        ],
        modules: {
          some: {
            module: {
              contentItems: {
                some: { contentItem: { trainerId: trainerUserId } },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    return Boolean(programme);
  }

  private async assertCanSyncContent(
    tx: Prisma.TransactionClient,
    entrepreneurUserId: string,
    item: LearnerContentProgressInputDto,
  ) {
    const programme = await tx.programme.findFirst({
      where: {
        id: item.programmeId,
        archivedAt: null,
        publishedAt: { not: null },
        OR: [
          { accessType: ProgrammeAccessType.free },
          { accessGrants: { some: { entrepreneurUserId, revokedAt: null } } },
        ],
        modules: {
          some: {
            moduleId: item.moduleId,
            module: {
              contentItems: {
                some: {
                  contentItemId: item.contentItemId,
                  contentItem: { status: 'ready' },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (!programme) {
      throw new ForbiddenException(
        'You do not have access to sync this content progress.',
      );
    }
  }

  private async upsertContentProgress(
    tx: Prisma.TransactionClient,
    entrepreneurUserId: string,
    item: LearnerContentProgressInputDto,
    clientEventAt: Date,
  ) {
    const key = {
      entrepreneurUserId,
      programmeId: item.programmeId,
      moduleId: item.moduleId,
      contentItemId: item.contentItemId,
    };
    const existing = await tx.learnerContentProgress.findUnique({
      where: { entrepreneurUserId_programmeId_moduleId_contentItemId: key },
      select: {
        completedAt: true,
        progressPercent: true,
        startedAt: true,
        status: true,
        lastSyncedAt: true,
        durationSeconds: true,
        lastPositionSeconds: true,
      },
    });

    if (existing && clientEventAt <= existing.lastSyncedAt) {
      return { applied: false, aggregateChanged: false };
    }

    const effectiveDuration =
      item.durationSeconds ?? existing?.durationSeconds ?? undefined;
    if (
      item.lastPositionSeconds !== undefined &&
      effectiveDuration !== undefined &&
      item.lastPositionSeconds > effectiveDuration
    ) {
      throw new BadRequestException(
        'Playback position cannot be greater than the content duration.',
      );
    }

    const requestedCompleted = item.status === LearnerProgressStatus.completed;
    const incomingPercent = requestedCompleted ? 100 : item.progressPercent;
    const progressPercent = Math.max(
      existing?.progressPercent ?? 0,
      incomingPercent,
    );
    const status =
      existing?.status === LearnerProgressStatus.completed
        ? LearnerProgressStatus.completed
        : this.progressStatus(progressPercent, item.status);
    const startedAt =
      existing?.startedAt ??
      (status === LearnerProgressStatus.not_started ? null : clientEventAt);
    const completedAt =
      existing?.completedAt ??
      (status === LearnerProgressStatus.completed ? clientEventAt : null);
    const source =
      item.source === ProgressSource.explicit_action
        ? ProgressSource.explicit_action
        : ProgressSource.player;

    const aggregateChanged =
      !existing ||
      existing.status !== status ||
      existing.progressPercent !== progressPercent;

    await tx.learnerContentProgress.upsert({
      where: { entrepreneurUserId_programmeId_moduleId_contentItemId: key },
      update: {
        status,
        progressPercent,
        ...(item.lastPositionSeconds !== undefined
          ? { lastPositionSeconds: item.lastPositionSeconds }
          : {}),
        ...(item.durationSeconds !== undefined
          ? { durationSeconds: item.durationSeconds }
          : {}),
        startedAt,
        completedAt,
        lastOpenedAt: clientEventAt,
        lastSyncedAt: clientEventAt,
        source,
      },
      create: {
        ...key,
        status,
        progressPercent,
        lastPositionSeconds: item.lastPositionSeconds,
        durationSeconds: item.durationSeconds,
        startedAt,
        completedAt,
        lastOpenedAt: clientEventAt,
        lastSyncedAt: clientEventAt,
        source,
      },
    });
    return { applied: true, aggregateChanged };
  }

  private async recomputeProgrammeProgress(
    tx: Prisma.TransactionClient,
    entrepreneurUserId: string,
    programmeId: string,
    touchedModuleIds: Set<string>,
    syncedAt: Date,
  ) {
    const programme = await tx.programme.findUnique({
      where: { id: programmeId },
      include: {
        modules: {
          include: {
            module: {
              include: {
                contentItems: {
                  where: { contentItem: { status: 'ready' } },
                  include: { contentItem: { select: { id: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!programme) return;

    const programmeModuleIds = programme.modules.map((item) => item.moduleId);
    const progressRows = await tx.learnerContentProgress.findMany({
      where: {
        entrepreneurUserId,
        programmeId,
        moduleId: { in: programmeModuleIds },
      },
      select: {
        moduleId: true,
        contentItemId: true,
        progressPercent: true,
        status: true,
      },
    });
    const progressByContext = new Map(
      progressRows.map((row) => [
        this.contentProgressKey(row.moduleId, row.contentItemId),
        row,
      ]),
    );
    const existingModules = await tx.learnerModuleProgress.findMany({
      where: {
        entrepreneurUserId,
        programmeId,
        moduleId: { in: [...touchedModuleIds] },
      },
    });
    const existingModuleById = new Map(
      existingModules.map((item) => [item.moduleId, item]),
    );

    for (const programmeModule of programme.modules) {
      if (!touchedModuleIds.has(programmeModule.moduleId)) continue;
      const contentIds = programmeModule.module.contentItems.map(
        (item) => item.contentItem.id,
      );
      const moduleProgress = this.aggregateProgress(
        programmeModule.moduleId,
        contentIds,
        progressByContext,
      );
      const existing = existingModuleById.get(programmeModule.moduleId);
      const startedAt =
        existing?.startedAt ??
        (moduleProgress.status === LearnerProgressStatus.not_started
          ? null
          : syncedAt);
      const completedAt =
        moduleProgress.status === LearnerProgressStatus.completed
          ? existing?.completedAt ?? syncedAt
          : null;

      await tx.learnerModuleProgress.upsert({
        where: {
          entrepreneurUserId_programmeId_moduleId: {
            entrepreneurUserId,
            programmeId,
            moduleId: programmeModule.moduleId,
          },
        },
        update: {
          status: moduleProgress.status,
          progressPercent: moduleProgress.percent,
          completedContentCount: moduleProgress.completedCount,
          totalContentCount: moduleProgress.totalCount,
          startedAt,
          completedAt,
          lastSyncedAt: syncedAt,
        },
        create: {
          entrepreneurUserId,
          programmeId,
          moduleId: programmeModule.moduleId,
          status: moduleProgress.status,
          progressPercent: moduleProgress.percent,
          completedContentCount: moduleProgress.completedCount,
          totalContentCount: moduleProgress.totalCount,
          startedAt,
          completedAt,
          lastSyncedAt: syncedAt,
        },
      });

      if (
        moduleProgress.status === LearnerProgressStatus.completed &&
        existing?.status !== LearnerProgressStatus.completed
      ) {
        await this.createModuleCompletionDeliverableInstances(
          tx,
          entrepreneurUserId,
          programmeId,
          programmeModule.moduleId,
          syncedAt,
        );
      }
    }

    const moduleRows = await tx.learnerModuleProgress.findMany({
      where: { entrepreneurUserId, programmeId },
    });
    const moduleProgressById = new Map(
      moduleRows.map((row) => [row.moduleId, row]),
    );
    const completedModuleCount = programmeModuleIds.filter(
      (moduleId) =>
        moduleProgressById.get(moduleId)?.status ===
        LearnerProgressStatus.completed,
    ).length;
    const totalContentCount = programme.modules.reduce(
      (sum, item) => sum + item.module.contentItems.length,
      0,
    );
    const completedContentCount = programmeModuleIds.reduce(
      (sum, moduleId) =>
        sum + (moduleProgressById.get(moduleId)?.completedContentCount ?? 0),
      0,
    );
    const moduleProgressValues = programmeModuleIds.map(
      (moduleId) => moduleProgressById.get(moduleId)?.progressPercent ?? 0,
    );
    const programmePercent = moduleProgressValues.length
      ? Math.round(
          moduleProgressValues.reduce((sum, value) => sum + value, 0) /
            moduleProgressValues.length,
        )
      : 0;
    const programmeStatus = this.aggregateStatus(
      programmePercent,
      completedModuleCount,
      programmeModuleIds.length,
    );
    const existingProgramme = await tx.learnerProgrammeProgress.findUnique({
      where: {
        entrepreneurUserId_programmeId: { entrepreneurUserId, programmeId },
      },
    });
    const startedAt =
      existingProgramme?.startedAt ??
      (programmeStatus === LearnerProgressStatus.not_started ? null : syncedAt);
    const completedAt =
      programmeStatus === LearnerProgressStatus.completed
        ? existingProgramme?.completedAt ?? syncedAt
        : null;

    await tx.learnerProgrammeProgress.upsert({
      where: {
        entrepreneurUserId_programmeId: { entrepreneurUserId, programmeId },
      },
      update: {
        status: programmeStatus,
        progressPercent: programmePercent,
        completedModuleCount,
        totalModuleCount: programmeModuleIds.length,
        completedContentCount,
        totalContentCount,
        startedAt,
        completedAt,
        lastSyncedAt: syncedAt,
      },
      create: {
        entrepreneurUserId,
        programmeId,
        status: programmeStatus,
        progressPercent: programmePercent,
        completedModuleCount,
        totalModuleCount: programmeModuleIds.length,
        completedContentCount,
        totalContentCount,
        startedAt,
        completedAt,
        lastSyncedAt: syncedAt,
      },
    });
  }

  private async createModuleCompletionDeliverableInstances(
    tx: Prisma.TransactionClient,
    entrepreneurUserId: string,
    programmeId: string,
    moduleId: string,
    completedAt: Date,
  ) {
    const settings = await tx.companySettings.findUnique({ where: { singletonKey: 'default' } });
    const dueDays = settings?.moduleCompletionDeliverableDueDays ?? 0;
    const dueDate = new Date(completedAt);
    dueDate.setDate(dueDate.getDate() + dueDays);

    const rules = await tx.programmeDeliverableRule.findMany({
      where: {
        programmeId,
        dueType: DeliverableDueType.module_completion,
        dueAfterModuleId: moduleId,
        active: true,
      },
      select: {
        id: true,
        programmeId: true,
        requiredForScope: true,
        requiredStageId: true,
      },
    });

    if (!rules.length) return;

    const entrepreneur = await tx.user.findUnique({
      where: { id: entrepreneurUserId },
      select: {
        businessMemberships: {
          where: { isPrimary: true },
          take: 1,
          select: { business: { select: { stageId: true } } },
        },
      },
    });
    const stageId = entrepreneur?.businessMemberships[0]?.business.stageId ?? null;

    await tx.deliverableInstance.createMany({
      data: rules
        .filter((rule) => rule.requiredForScope !== DeliverableRequiredScope.stage || rule.requiredStageId === stageId)
        .map((rule) => ({
          ruleId: rule.id,
          entrepreneurUserId,
          programmeId: rule.programmeId,
          dueDate,
          status: DeliverableInstanceStatus.not_submitted,
        })),
      skipDuplicates: true,
    });
  }

  private aggregateProgress(
    moduleId: string,
    contentIds: string[],
    progressByContext: Map<
      string,
      { progressPercent: number; status: LearnerProgressStatus }
    >,
  ) {
    const totalCount = contentIds.length;
    if (totalCount === 0) {
      return {
        totalCount,
        completedCount: 0,
        percent: 0,
        status: LearnerProgressStatus.not_started,
      };
    }

    const rows = contentIds.map((contentItemId) =>
      progressByContext.get(this.contentProgressKey(moduleId, contentItemId)),
    );
    const progressValues = rows.map((row) => row?.progressPercent ?? 0);
    const completedCount = rows.filter(
      (row) => row?.status === LearnerProgressStatus.completed,
    ).length;
    const percent = Math.round(
      progressValues.reduce((sum, value) => sum + value, 0) / totalCount,
    );

    return {
      totalCount,
      completedCount,
      percent,
      status: this.aggregateStatus(percent, completedCount, totalCount),
    };
  }

  private contentProgressKey(moduleId: string | null, contentItemId: string) {
    return String(moduleId) + ':' + contentItemId;
  }

  private aggregateStatus(percent: number, completedCount: number, totalCount: number) {
    if (totalCount > 0 && completedCount === totalCount) return LearnerProgressStatus.completed;
    if (percent > 0 || completedCount > 0) return LearnerProgressStatus.in_progress;
    return LearnerProgressStatus.not_started;
  }

  private progressStatus(
    progressPercent: number,
    requestedStatus: LearnerProgressStatus,
  ) {
    if (
      requestedStatus === LearnerProgressStatus.completed ||
      progressPercent >= 100
    ) {
      return LearnerProgressStatus.completed;
    }
    if (
      requestedStatus === LearnerProgressStatus.in_progress ||
      progressPercent > 0
    ) {
      return LearnerProgressStatus.in_progress;
    }
    return LearnerProgressStatus.not_started;
  }

  private async progressPayload(
    entrepreneurUserId: string,
    query: LearnerProgressQueryDto,
  ) {
    const [programme, module, content] = await Promise.all([
      this.prisma.learnerProgrammeProgress.findUnique({
        where: {
          entrepreneurUserId_programmeId: {
            entrepreneurUserId,
            programmeId: query.programmeId,
          },
        },
      }),
      query.moduleId
        ? this.prisma.learnerModuleProgress.findUnique({
            where: {
              entrepreneurUserId_programmeId_moduleId: {
                entrepreneurUserId,
                programmeId: query.programmeId,
                moduleId: query.moduleId,
              },
            },
          })
        : Promise.resolve(null),
      query.moduleId && query.contentItemId
        ? this.prisma.learnerContentProgress.findUnique({
            where: {
              entrepreneurUserId_programmeId_moduleId_contentItemId: {
                entrepreneurUserId,
                programmeId: query.programmeId,
                moduleId: query.moduleId,
                contentItemId: query.contentItemId,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      entrepreneurUserId,
      programme: programme ? this.mapProgrammeProgress(programme) : null,
      module: module ? this.mapModuleProgress(module) : null,
      content: content ? this.mapContentProgress(content) : null,
    };
  }

  private mapProgrammeProgress(item: Prisma.LearnerProgrammeProgressGetPayload<object>) {
    return {
      programmeId: item.programmeId,
      status: item.status,
      progressPercent: item.progressPercent,
      completedModuleCount: item.completedModuleCount,
      totalModuleCount: item.totalModuleCount,
      completedContentCount: item.completedContentCount,
      totalContentCount: item.totalContentCount,
      startedAt: item.startedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      lastSyncedAt: item.lastSyncedAt.toISOString(),
    };
  }

  private mapModuleProgress(item: Prisma.LearnerModuleProgressGetPayload<object>) {
    return {
      programmeId: item.programmeId,
      moduleId: item.moduleId,
      status: item.status,
      progressPercent: item.progressPercent,
      completedContentCount: item.completedContentCount,
      totalContentCount: item.totalContentCount,
      startedAt: item.startedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      lastSyncedAt: item.lastSyncedAt.toISOString(),
    };
  }

  private mapContentProgress(item: Prisma.LearnerContentProgressGetPayload<object>) {
    return {
      programmeId: item.programmeId,
      moduleId: item.moduleId,
      contentItemId: item.contentItemId,
      status: item.status,
      progressPercent: item.progressPercent,
      lastPositionSeconds: item.lastPositionSeconds,
      durationSeconds: item.durationSeconds,
      startedAt: item.startedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      lastOpenedAt: item.lastOpenedAt?.toISOString() ?? null,
      lastSyncedAt: item.lastSyncedAt.toISOString(),
      source: item.source,
    };
  }

}
