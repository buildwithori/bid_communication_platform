import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DeliverableDueType, DeliverableInstanceStatus, DeliverableRequiredScope, LearnerProgressStatus, Prisma, ProgrammeAccessType, ProgressSource, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { LearnerProgressQueryDto } from './dto/learner-progress-query.dto';
import { LearnerContentProgressInputDto, SyncLearnerProgressDto } from './dto/sync-learner-progress.dto';

const MAX_SYNC_ITEMS = 50;

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgress(user: User, query: LearnerProgressQueryDto) {
    const entrepreneurUserId = await this.resolveProgressOwner(user, query);
    return this.progressPayload(entrepreneurUserId, query.programmeId);
  }

  async syncProgress(user: User, input: SyncLearnerProgressDto) {
    if (user.role !== UserRole.entrepreneur) {
      throw new ForbiddenException('Only entrepreneurs can sync learner progress.');
    }

    if (!input.items.length) {
      throw new BadRequestException('At least one progress item is required.');
    }

    if (input.items.length > MAX_SYNC_ITEMS) {
      throw new BadRequestException(`A progress sync can include at most ${MAX_SYNC_ITEMS} items.`);
    }

    const now = new Date();
    const touchedProgrammes = new Map<string, Set<string>>();

    for (const item of input.items) {
      await this.assertCanSyncContent(user.id, item);
      await this.upsertContentProgress(user.id, item, now);

      const moduleIds = touchedProgrammes.get(item.programmeId) ?? new Set<string>();
      moduleIds.add(item.moduleId);
      touchedProgrammes.set(item.programmeId, moduleIds);
    }

    for (const [programmeId, moduleIds] of touchedProgrammes) {
      await this.recomputeProgrammeProgress(user.id, programmeId, moduleIds, now);
    }

    return this.progressPayload(user.id);
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
      const canRead = await this.trainerCanReadEntrepreneurProgress(user.id, query.entrepreneurUserId);
      if (!canRead) {
        throw new ForbiddenException('You do not have access to this learner progress.');
      }
    }

    return query.entrepreneurUserId;
  }

  private async trainerCanReadEntrepreneurProgress(trainerUserId: string, entrepreneurUserId: string) {
    const [assignedProgrammeCount, contentProgressCount] = await Promise.all([
      this.prisma.programmeAccessGrant.count({
        where: {
          entrepreneurUserId,
          revokedAt: null,
          programme: {
            modules: {
              some: {
                module: {
                  contentItems: {
                    some: {
                      contentItem: { trainerId: trainerUserId },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.learnerContentProgress.count({
        where: {
          entrepreneurUserId,
          contentItem: { trainerId: trainerUserId },
        },
      }),
    ]);

    return assignedProgrammeCount > 0 || contentProgressCount > 0;
  }

  private async assertCanSyncContent(entrepreneurUserId: string, item: LearnerContentProgressInputDto) {
    const programme = await this.prisma.programme.findFirst({
      where: {
        id: item.programmeId,
        archivedAt: null,
        OR: [
          { accessType: ProgrammeAccessType.free },
          { accessGrants: { some: { entrepreneurUserId, revokedAt: null } } },
        ],
        modules: {
          some: {
            moduleId: item.moduleId,
            module: {
              contentItems: {
                some: { contentItemId: item.contentItemId },
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (!programme) {
      throw new ForbiddenException('You do not have access to sync this content progress.');
    }
  }

  private async upsertContentProgress(
    entrepreneurUserId: string,
    item: LearnerContentProgressInputDto,
    syncedAt: Date,
  ) {
    const existing = await this.prisma.learnerContentProgress.findUnique({
      where: {
        entrepreneurUserId_programmeId_moduleId_contentItemId: {
          entrepreneurUserId,
          programmeId: item.programmeId,
          moduleId: item.moduleId,
          contentItemId: item.contentItemId,
        },
      },
      select: {
        completedAt: true,
        progressPercent: true,
        status: true,
      },
    });
    const incomingPercent = item.completed ? 100 : item.progressPercent;
    const progressPercent = Math.max(existing?.progressPercent ?? 0, incomingPercent);
    const status =
      existing?.status === LearnerProgressStatus.completed
        ? LearnerProgressStatus.completed
        : this.progressStatus(progressPercent, item.completed);
    const completedAt =
      existing?.completedAt ?? (status === LearnerProgressStatus.completed ? syncedAt : undefined);
    const source = item.completed ? ProgressSource.explicit_action : ProgressSource.player;

    await this.prisma.learnerContentProgress.upsert({
      where: {
        entrepreneurUserId_programmeId_moduleId_contentItemId: {
          entrepreneurUserId,
          programmeId: item.programmeId,
          moduleId: item.moduleId,
          contentItemId: item.contentItemId,
        },
      },
      update: {
        status,
        progressPercent,
        lastPositionSeconds: item.lastPositionSeconds,
        durationSeconds: item.durationSeconds,
        lastOpenedAt: syncedAt,
        lastSyncedAt: syncedAt,
        completedAt,
        source,
      },
      create: {
        entrepreneurUserId,
        programmeId: item.programmeId,
        moduleId: item.moduleId,
        contentItemId: item.contentItemId,
        status,
        progressPercent,
        lastPositionSeconds: item.lastPositionSeconds,
        durationSeconds: item.durationSeconds,
        startedAt: status === LearnerProgressStatus.not_started ? null : syncedAt,
        completedAt: status === LearnerProgressStatus.completed ? syncedAt : null,
        lastOpenedAt: syncedAt,
        lastSyncedAt: syncedAt,
        source,
      },
    });
  }

  private async recomputeProgrammeProgress(
    entrepreneurUserId: string,
    programmeId: string,
    touchedModuleIds: Set<string>,
    syncedAt: Date,
  ) {
    const programme = await this.prisma.programme.findUnique({
      where: { id: programmeId },
      include: {
        modules: {
          include: {
            module: {
              include: {
                contentItems: {
                  include: { contentItem: { select: { id: true, status: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!programme) return;

    const programmeContentIds = programme.modules.flatMap((programmeModule) =>
      programmeModule.module.contentItems.map((item) => item.contentItem.id),
    );
    const progressRows = await this.prisma.learnerContentProgress.findMany({
      where: {
        entrepreneurUserId,
        programmeId,
        contentItemId: { in: programmeContentIds },
      },
      select: {
        contentItemId: true,
        progressPercent: true,
        status: true,
      },
    });
    const progressByContentId = new Map(progressRows.map((row) => [row.contentItemId, row]));

    for (const programmeModule of programme.modules) {
      if (!touchedModuleIds.has(programmeModule.moduleId)) continue;

      const moduleContentIds = programmeModule.module.contentItems.map((item) => item.contentItem.id);
      const moduleProgress = this.aggregateProgress(moduleContentIds, progressByContentId);

      await this.prisma.learnerModuleProgress.upsert({
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
          completedAt: moduleProgress.status === LearnerProgressStatus.completed ? syncedAt : undefined,
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
          startedAt: moduleProgress.status === LearnerProgressStatus.not_started ? null : syncedAt,
          completedAt: moduleProgress.status === LearnerProgressStatus.completed ? syncedAt : null,
          lastSyncedAt: syncedAt,
        },
      });

      if (moduleProgress.status === LearnerProgressStatus.completed) {
        await this.createModuleCompletionDeliverableInstances(
          entrepreneurUserId,
          programmeId,
          programmeModule.moduleId,
          syncedAt,
        );
      }
    }

    const moduleRows = await this.prisma.learnerModuleProgress.findMany({
      where: {
        entrepreneurUserId,
        programmeId,
      },
      select: {
        moduleId: true,
        progressPercent: true,
        status: true,
        completedContentCount: true,
        totalContentCount: true,
      },
    });
    const moduleProgressById = new Map(moduleRows.map((row) => [row.moduleId, row]));
    const programmeModuleIds = programme.modules.map((programmeModule) => programmeModule.moduleId);
    const completedModuleCount = programmeModuleIds.filter(
      (moduleId) => moduleProgressById.get(moduleId)?.status === LearnerProgressStatus.completed,
    ).length;
    const totalContentCount = programme.modules.reduce(
      (sum, programmeModule) => sum + programmeModule.module.contentItems.length,
      0,
    );
    const completedContentCount = programmeModuleIds.reduce(
      (sum, moduleId) => sum + (moduleProgressById.get(moduleId)?.completedContentCount ?? 0),
      0,
    );
    const moduleProgressValues = programmeModuleIds.map((moduleId) => moduleProgressById.get(moduleId)?.progressPercent ?? 0);
    const programmePercent = moduleProgressValues.length
      ? Math.round(moduleProgressValues.reduce((sum, value) => sum + value, 0) / moduleProgressValues.length)
      : 0;
    const programmeStatus = this.aggregateStatus(programmePercent, completedModuleCount, programmeModuleIds.length);

    await this.prisma.learnerProgrammeProgress.upsert({
      where: {
        entrepreneurUserId_programmeId: {
          entrepreneurUserId,
          programmeId,
        },
      },
      update: {
        status: programmeStatus,
        progressPercent: programmePercent,
        completedModuleCount,
        totalModuleCount: programmeModuleIds.length,
        completedContentCount,
        totalContentCount,
        completedAt: programmeStatus === LearnerProgressStatus.completed ? syncedAt : undefined,
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
        startedAt: programmeStatus === LearnerProgressStatus.not_started ? null : syncedAt,
        completedAt: programmeStatus === LearnerProgressStatus.completed ? syncedAt : null,
        lastSyncedAt: syncedAt,
      },
    });
  }

  private async createModuleCompletionDeliverableInstances(
    entrepreneurUserId: string,
    programmeId: string,
    moduleId: string,
    completedAt: Date,
  ) {
    const settings = await this.prisma.companySettings.findUnique({ where: { singletonKey: 'default' } });
    const dueDays = settings?.moduleCompletionDeliverableDueDays ?? 0;
    const dueDate = new Date(completedAt);
    dueDate.setDate(dueDate.getDate() + dueDays);

    const rules = await this.prisma.programmeDeliverableRule.findMany({
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

    const entrepreneur = await this.prisma.user.findUnique({
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

    await this.prisma.deliverableInstance.createMany({
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
    contentIds: string[],
    progressByContentId: Map<string, { progressPercent: number; status: LearnerProgressStatus }>,
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

    const progressValues = contentIds.map((contentId) => progressByContentId.get(contentId)?.progressPercent ?? 0);
    const completedCount = contentIds.filter(
      (contentId) => progressByContentId.get(contentId)?.status === LearnerProgressStatus.completed,
    ).length;
    const percent = Math.round(progressValues.reduce((sum, value) => sum + value, 0) / totalCount);

    return {
      totalCount,
      completedCount,
      percent,
      status: this.aggregateStatus(percent, completedCount, totalCount),
    };
  }

  private aggregateStatus(percent: number, completedCount: number, totalCount: number) {
    if (totalCount > 0 && completedCount === totalCount) return LearnerProgressStatus.completed;
    if (percent > 0 || completedCount > 0) return LearnerProgressStatus.in_progress;
    return LearnerProgressStatus.not_started;
  }

  private progressStatus(progressPercent: number, completed?: boolean) {
    if (completed || progressPercent >= 100) return LearnerProgressStatus.completed;
    if (progressPercent > 0) return LearnerProgressStatus.in_progress;
    return LearnerProgressStatus.not_started;
  }

  private async progressPayload(entrepreneurUserId: string, programmeId?: string) {
    const programmeWhere: Prisma.LearnerProgrammeProgressWhereInput = {
      entrepreneurUserId,
      ...(programmeId ? { programmeId } : {}),
    };
    const moduleWhere: Prisma.LearnerModuleProgressWhereInput = {
      entrepreneurUserId,
      ...(programmeId ? { programmeId } : {}),
    };
    const contentWhere: Prisma.LearnerContentProgressWhereInput = {
      entrepreneurUserId,
      ...(programmeId ? { programmeId } : {}),
    };

    const [programmes, modules, content] = await Promise.all([
      this.prisma.learnerProgrammeProgress.findMany({
        where: programmeWhere,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.learnerModuleProgress.findMany({
        where: moduleWhere,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.learnerContentProgress.findMany({
        where: contentWhere,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    return {
      entrepreneurUserId,
      programmes: programmes.map((item) => ({
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
      })),
      modules: modules.map((item) => ({
        programmeId: item.programmeId,
        moduleId: item.moduleId,
        status: item.status,
        progressPercent: item.progressPercent,
        completedContentCount: item.completedContentCount,
        totalContentCount: item.totalContentCount,
        startedAt: item.startedAt?.toISOString() ?? null,
        completedAt: item.completedAt?.toISOString() ?? null,
        lastSyncedAt: item.lastSyncedAt.toISOString(),
      })),
      content: content.map((item) => ({
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
      })),
    };
  }
}
