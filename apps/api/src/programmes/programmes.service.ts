import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliverableDueType, DeliverableInstanceStatus, DeliverableRequiredScope, Prisma, Programme, ProgrammeAccessType, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../files/storage.service';
import { ProgrammeQueryDto, ProgrammeLifecycle } from './dto/programme-query.dto';
import { CreateProgrammeDeliverableRuleDto, UpsertProgrammeDeliverableRuleDto } from './dto/upsert-programme-deliverable-rule.dto';

const DEFAULT_TAKE = 20;

const deliverableRuleInclude = {
  dueAfterModule: { select: { id: true, title: true } },
  requiredStage: { select: { id: true, name: true, key: true } },
  instances: {
    select: {
      id: true,
      status: true,
      submissions: { select: { id: true }, take: 1 },
    },
  },
} satisfies Prisma.ProgrammeDeliverableRuleInclude;

type ProgrammeDeliverableRuleWithInclude = Prisma.ProgrammeDeliverableRuleGetPayload<{ include: typeof deliverableRuleInclude }>;

@Injectable()
export class ProgrammesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listProgrammes(user: User, query: ProgrammeQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const where = this.buildProgrammeWhere(user, query);

    const rows = await this.prisma.programme.findMany({
      where,
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        _count: {
          select: {
            modules: true,
            accessGrants: { where: { revokedAt: null } },
          },
        },
        progress: {
          select: { progressPercent: true },
        },
        modules: {
          include: {
            module: {
              include: {
                contentItems: {
                  include: {
                    contentItem: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const nextCursor = rows.length > take ? rows[take]?.id ?? null : null;
    const items = rows.slice(0, take).map((programme) => this.mapProgrammeListItem(programme));

    return { items, nextCursor };
  }

  async listDeliverableRules(user: User, programmeId: string) {
    if (!(await this.canReadProgramme(user, programmeId))) {
      throw new ForbiddenException('You do not have access to this programme.');
    }

    const rules = await this.prisma.programmeDeliverableRule.findMany({
      where: { programmeId },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
      include: this.deliverableRuleInclude(),
    });

    return { items: rules.map((rule) => this.mapDeliverableRule(rule)) };
  }

  async createDeliverableRule(user: User, programmeId: string, dto: CreateProgrammeDeliverableRuleDto) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException('Only admins can manage programme deliverable rules.');
    }

    await this.ensureProgrammeExists(programmeId);
    await this.validateDeliverableRuleInput(programmeId, dto);

    const rule = await this.prisma.programmeDeliverableRule.create({
      data: this.deliverableRuleData(programmeId, dto) as Prisma.ProgrammeDeliverableRuleUncheckedCreateInput,
      include: this.deliverableRuleInclude(),
    });

    await this.createImmediateDeliverableInstances(rule.id);

    return this.mapDeliverableRule(
      await this.prisma.programmeDeliverableRule.findUniqueOrThrow({
        where: { id: rule.id },
        include: this.deliverableRuleInclude(),
      }),
    );
  }

  async updateDeliverableRule(
    user: User,
    programmeId: string,
    ruleId: string,
    dto: UpsertProgrammeDeliverableRuleDto,
  ) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException('Only admins can manage programme deliverable rules.');
    }

    const existing = await this.prisma.programmeDeliverableRule.findFirst({
      where: { id: ruleId, programmeId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Programme deliverable rule was not found.');

    await this.validateDeliverableRuleInput(programmeId, dto, ruleId);

    const updated = await this.prisma.programmeDeliverableRule.update({
      where: { id: ruleId },
      data: this.deliverableRuleData(programmeId, dto, true) as Prisma.ProgrammeDeliverableRuleUncheckedUpdateInput,
      include: this.deliverableRuleInclude(),
    });

    await this.createImmediateDeliverableInstances(ruleId);

    return this.mapDeliverableRule(updated);
  }

  async getProgramme(user: User, id: string) {
    const programme = await this.prisma.programme.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            accessGrants: { where: { revokedAt: null } },
          },
        },
        progress: {
          select: { progressPercent: true },
        },
        modules: {
          orderBy: { position: 'asc' },
          include: {
            module: {
              include: {
                contentItems: {
                  orderBy: { position: 'asc' },
                  include: {
                    contentItem: {
                      include: {
                        trainer: {
                          select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                          },
                        },
                        videoAsset: true,
                        fileAssets: true,
                        toolLink: { include: { tool: { select: { id: true, name: true, embeddedUrl: true } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!programme) {
      throw new NotFoundException('Programme was not found.');
    }

    if (!(await this.canReadProgramme(user, id))) {
      throw new ForbiddenException('You do not have access to this programme.');
    }

    return this.mapProgrammeDetail(programme);
  }

  private deliverableRuleInclude() {
    return deliverableRuleInclude;
  }

  private deliverableRuleData(
    programmeId: string,
    dto: CreateProgrammeDeliverableRuleDto | UpsertProgrammeDeliverableRuleDto,
    partial = false,
  ): Prisma.ProgrammeDeliverableRuleUncheckedCreateInput | Prisma.ProgrammeDeliverableRuleUncheckedUpdateInput {
    const dueType = dto.dueType;
    const requiredForScope = dto.requiredForScope ?? (!partial ? DeliverableRequiredScope.all : undefined);

    return {
      programmeId,
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dueType !== undefined ? { dueType } : {}),
      ...(dueType !== undefined || dto.dueDate !== undefined
        ? { dueDate: dueType === DeliverableDueType.fixed_date && dto.dueDate ? this.dateOnly(dto.dueDate) : null }
        : {}),
      ...(dueType !== undefined || dto.dueAfterModuleId !== undefined
        ? { dueAfterModuleId: dueType === DeliverableDueType.module_completion ? dto.dueAfterModuleId ?? null : null }
        : {}),
      ...(dueType !== undefined || dto.recurringCadence !== undefined
        ? { recurringCadence: dueType === DeliverableDueType.recurring ? dto.recurringCadence ?? null : null }
        : {}),
      ...(requiredForScope !== undefined ? { requiredForScope } : {}),
      ...(requiredForScope !== undefined || dto.requiredStageId !== undefined
        ? { requiredStageId: requiredForScope === DeliverableRequiredScope.stage ? dto.requiredStageId ?? null : null }
        : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    };
  }

  private async validateDeliverableRuleInput(
    programmeId: string,
    dto: CreateProgrammeDeliverableRuleDto | UpsertProgrammeDeliverableRuleDto,
    currentRuleId?: string,
  ) {
    if (dto.name?.trim()) {
      const duplicate = await this.prisma.programmeDeliverableRule.findFirst({
        where: {
          programmeId,
          name: { equals: dto.name.trim(), mode: 'insensitive' },
          ...(currentRuleId ? { id: { not: currentRuleId } } : {}),
        },
        select: { id: true },
      });
      if (duplicate) throw new BadRequestException('A deliverable rule with this name already exists in this programme.');
    }

    if (dto.dueType === DeliverableDueType.fixed_date && !dto.dueDate) {
      throw new BadRequestException('A fixed-date deliverable needs a due date.');
    }
    if (dto.dueType === DeliverableDueType.module_completion && !dto.dueAfterModuleId) {
      throw new BadRequestException('A module-completion deliverable needs a module.');
    }
    if (dto.dueType === DeliverableDueType.recurring && !dto.recurringCadence) {
      throw new BadRequestException('A recurring deliverable needs a cadence.');
    }
    if (dto.requiredForScope === DeliverableRequiredScope.stage && !dto.requiredStageId) {
      throw new BadRequestException('A stage-specific deliverable needs a business stage.');
    }

    if (dto.dueAfterModuleId) {
      const moduleBelongsToProgramme = await this.prisma.programmeModule.count({
        where: { programmeId, moduleId: dto.dueAfterModuleId },
      });
      if (moduleBelongsToProgramme === 0) {
        throw new BadRequestException('The selected module does not belong to this programme.');
      }
    }

    if (dto.requiredStageId) {
      const stage = await this.prisma.businessStage.findFirst({
        where: { id: dto.requiredStageId, active: true },
        select: { id: true },
      });
      if (!stage) throw new BadRequestException('The selected business stage is not active.');
    }
  }

  private async createImmediateDeliverableInstances(ruleId: string) {
    const rule = await this.prisma.programmeDeliverableRule.findUnique({
      where: { id: ruleId },
      include: { programme: { select: { accessType: true } } },
    });
    if (!rule || !rule.active || rule.dueType !== DeliverableDueType.fixed_date || !rule.dueDate) return;

    const dueDate = rule.dueDate;
    const entrepreneurIds = await this.eligibleEntrepreneurIdsForRule(rule);
    const status = dueDate.getTime() < Date.now()
      ? DeliverableInstanceStatus.overdue
      : DeliverableInstanceStatus.not_submitted;

    await Promise.all(
      entrepreneurIds.map((entrepreneurUserId) =>
        this.prisma.deliverableInstance.upsert({
          where: {
            ruleId_entrepreneurUserId_programmeId: {
              ruleId: rule.id,
              entrepreneurUserId,
              programmeId: rule.programmeId,
            },
          },
          update: {
            dueDate,
            status,
          },
          create: {
            ruleId: rule.id,
            entrepreneurUserId,
            programmeId: rule.programmeId,
            dueDate,
            status,
          },
        }),
      ),
    );
  }

  private async eligibleEntrepreneurIdsForRule(rule: {
    programmeId: string;
    requiredForScope: DeliverableRequiredScope;
    requiredStageId: string | null;
    programme: { accessType: ProgrammeAccessType };
  }) {
    const stageFilter =
      rule.requiredForScope === DeliverableRequiredScope.stage && rule.requiredStageId
        ? {
            businessMemberships: {
              some: {
                isPrimary: true,
                business: { stageId: rule.requiredStageId },
              },
            },
          }
        : {};

    if (rule.programme.accessType === ProgrammeAccessType.free) {
      const users = await this.prisma.user.findMany({
        where: { role: UserRole.entrepreneur, ...stageFilter },
        select: { id: true },
      });
      return users.map((user) => user.id);
    }

    const grants = await this.prisma.programmeAccessGrant.findMany({
      where: {
        programmeId: rule.programmeId,
        revokedAt: null,
        entrepreneur: stageFilter,
      },
      select: { entrepreneurUserId: true },
    });
    return grants.map((grant) => grant.entrepreneurUserId);
  }

  private mapDeliverableRule(rule: ProgrammeDeliverableRuleWithInclude) {
    const submittedCount = rule.instances.filter((instance) => instance.submissions.length > 0).length;

    return {
      id: rule.id,
      programmeId: rule.programmeId,
      name: rule.name,
      dueType: rule.dueType,
      dueDate: rule.dueDate?.toISOString() ?? null,
      dueAfterModule: rule.dueAfterModule,
      recurringCadence: rule.recurringCadence,
      requiredForScope: rule.requiredForScope,
      requiredStage: rule.requiredStage,
      active: rule.active,
      submittedCount,
      assignedCount: rule.instances.length,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  private async ensureProgrammeExists(programmeId: string) {
    const programme = await this.prisma.programme.findUnique({ where: { id: programmeId }, select: { id: true } });
    if (!programme) throw new NotFoundException('Programme was not found.');
  }

  private dateOnly(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private buildProgrammeWhere(user: User, query: ProgrammeQueryDto): Prisma.ProgrammeWhereInput {
    const filters: Prisma.ProgrammeWhereInput[] = [];

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.accessType) {
      filters.push({ accessType: query.accessType });
    }

    const lifecycleWhere = this.lifecycleWhere(query.lifecycle);
    if (lifecycleWhere) {
      filters.push(lifecycleWhere);
    } else if (!query.includeArchived) {
      filters.push({ archivedAt: null });
    }

    const scopeWhere = this.programmeScopeWhere(user);
    if (scopeWhere) {
      filters.push(scopeWhere);
    }

    return filters.length ? { AND: filters } : {};
  }

  private lifecycleWhere(lifecycle?: ProgrammeLifecycle): Prisma.ProgrammeWhereInput | null {
    if (!lifecycle) return null;

    const now = new Date();
    if (lifecycle === 'archived') return { archivedAt: { not: null } };
    if (lifecycle === 'draft') return { archivedAt: null, publishedAt: null };
    if (lifecycle === 'scheduled') {
      return { archivedAt: null, publishedAt: { not: null }, startDate: { gt: now } };
    }
    if (lifecycle === 'completed') {
      return { archivedAt: null, publishedAt: { not: null }, endDate: { lt: now } };
    }
    return {
      archivedAt: null,
      publishedAt: { not: null },
      startDate: { lte: now },
      endDate: { gte: now },
    };
  }

  private programmeScopeWhere(user: User): Prisma.ProgrammeWhereInput | null {
    if (user.role === UserRole.admin) return null;

    if (user.role === UserRole.entrepreneur) {
      return {
        OR: [
          { accessType: ProgrammeAccessType.free },
          { accessGrants: { some: { entrepreneurUserId: user.id, revokedAt: null } } },
        ],
      };
    }

    return {
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
    };
  }

  private async canReadProgramme(user: User, programmeId: string) {
    if (user.role === UserRole.admin) return true;

    const count = await this.prisma.programme.count({
      where: {
        id: programmeId,
        ...this.programmeScopeWhere(user),
      },
    });

    return count > 0;
  }

  private mapProgrammeListItem(
    programme: Programme & {
      _count: { modules: number; accessGrants: number };
      progress: Array<{ progressPercent: number }>;
      modules: Array<{
        module: {
          contentItems: Array<{ contentItem: { type: string; status: string } }>;
        };
      }>;
    },
  ) {
    const contentItems = programme.modules.flatMap((programmeModule) => programmeModule.module.contentItems);
    const contentCounts = this.contentCounts(contentItems.map((item) => item.contentItem));
    const moduleCount = programme._count.modules;
    const readyModuleCount = this.readyModuleCount(programme.modules);

    return {
      id: programme.id,
      name: programme.name,
      description: programme.description,
      accessType: programme.accessType,
      lifecycle: this.lifecycle(programme),
      startDate: programme.startDate.toISOString(),
      endDate: programme.endDate.toISOString(),
      maxEntrepreneurs: programme.maxEntrepreneurs,
      publishedAt: programme.publishedAt?.toISOString() ?? null,
      archivedAt: programme.archivedAt?.toISOString() ?? null,
      enrollment: {
        active: programme._count.accessGrants,
        capacity: programme.maxEntrepreneurs,
      },
      modules: {
        total: moduleCount,
        ready: readyModuleCount,
      },
      content: contentCounts,
      readiness: moduleCount === 0 ? 0 : Math.round((readyModuleCount / moduleCount) * 100),
      learnerProgress: this.learnerProgress(programme.progress),
    };
  }

  private mapProgrammeDetail(
    programme: Programme & {
      _count: { accessGrants: number };
      progress: Array<{ progressPercent: number }>;
      modules: Array<{
        position: number;
        module: {
          id: string;
          title: string;
          description: string;
          isReusable: boolean;
          contentItems: Array<{
            position: number;
            contentItem: {
              id: string;
              title: string;
              type: string;
              durationSeconds: number | null;
              status: string;
              trainer: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
              videoAsset: { playbackId: string | null; muxAssetId: string | null; status: string } | null;
              fileAssets: Array<{ id: string; originalFilename: string; mimeType: string; sizeBytes: bigint; status: string; storageKey: string }>;
              toolLink: { source: string; toolId: string | null; externalUrl: string | null; tool: { id: string; name: string; embeddedUrl: string | null } | null } | null;
            };
          }>;
        };
      }>;
    },
  ) {
    const modules = programme.modules.map((programmeModule) => {
      const items = programmeModule.module.contentItems.map(({ position, contentItem }) => ({
        id: contentItem.id,
        title: contentItem.title,
        type: contentItem.type,
        position,
        status: contentItem.status,
        durationSeconds: contentItem.durationSeconds,
        trainer: contentItem.trainer
          ? {
              id: contentItem.trainer.id,
              name: [contentItem.trainer.firstName, contentItem.trainer.lastName].filter(Boolean).join(' ') || contentItem.trainer.email,
              email: contentItem.trainer.email,
            }
          : null,
        video: contentItem.videoAsset
          ? {
              muxAssetId: contentItem.videoAsset.muxAssetId,
              playbackId: contentItem.videoAsset.playbackId,
              status: contentItem.videoAsset.status,
            }
          : null,
        files: contentItem.fileAssets.map((file) => ({
          id: file.id,
          originalFilename: file.originalFilename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes.toString(),
          status: file.status,
          downloadUrl: file.status === 'ready'
            ? this.storage.presign({ method: 'GET', storageKey: file.storageKey, expiresInSeconds: 5 * 60 }).url
            : null,
        })),
        tool: contentItem.toolLink
          ? {
              source: contentItem.toolLink.source,
              toolId: contentItem.toolLink.toolId,
              toolName: contentItem.toolLink.tool?.name ?? null,
              externalUrl: contentItem.toolLink.externalUrl,
              url: contentItem.toolLink.tool?.embeddedUrl ?? contentItem.toolLink.externalUrl,
            }
          : null,
      }));

      return {
        id: programmeModule.module.id,
        title: programmeModule.module.title,
        description: programmeModule.module.description,
        position: programmeModule.position,
        isReusable: programmeModule.module.isReusable,
        contentItems: items,
        readiness: items.length > 0 && items.every((item) => item.status === 'ready') ? 'ready' : 'needs_content',
      };
    });

    const contentCounts = this.contentCounts(modules.flatMap((module) => module.contentItems));
    const readyModuleCount = modules.filter((module) => module.readiness === 'ready').length;

    return {
      id: programme.id,
      name: programme.name,
      description: programme.description,
      accessType: programme.accessType,
      lifecycle: this.lifecycle(programme),
      startDate: programme.startDate.toISOString(),
      endDate: programme.endDate.toISOString(),
      maxEntrepreneurs: programme.maxEntrepreneurs,
      publishedAt: programme.publishedAt?.toISOString() ?? null,
      archivedAt: programme.archivedAt?.toISOString() ?? null,
      archiveReason: programme.archiveReason,
      enrollment: {
        active: programme._count.accessGrants,
        capacity: programme.maxEntrepreneurs,
      },
      readiness: modules.length === 0 ? 0 : Math.round((readyModuleCount / modules.length) * 100),
      learnerProgress: this.learnerProgress(programme.progress),
      content: contentCounts,
      modules,
    };
  }

  private learnerProgress(progressRows: Array<{ progressPercent: number }>) {
    if (progressRows.length === 0) {
      return { average: 0, trackedLearners: 0 };
    }

    const average = Math.round(
      progressRows.reduce((sum, row) => sum + row.progressPercent, 0) / progressRows.length,
    );

    return { average, trackedLearners: progressRows.length };
  }

  private lifecycle(programme: Pick<Programme, 'publishedAt' | 'archivedAt' | 'startDate' | 'endDate'>) {
    if (programme.archivedAt) return 'archived';
    if (!programme.publishedAt) return 'draft';
    const now = new Date();
    if (programme.startDate > now) return 'scheduled';
    if (programme.endDate < now) return 'completed';
    return 'active';
  }

  private contentCounts(items: Array<{ type: string }>) {
    return items.reduce(
      (counts, item) => {
        if (item.type === 'video') counts.videos += 1;
        if (item.type === 'pdf') counts.pdfs += 1;
        if (item.type === 'tool') counts.tools += 1;
        counts.total += 1;
        return counts;
      },
      { total: 0, videos: 0, pdfs: 0, tools: 0 },
    );
  }

  private readyModuleCount(
    modules: Array<{
      module: {
        contentItems: Array<{ contentItem: { status: string } }>;
      };
    }>,
  ) {
    return modules.filter(({ module }) => {
      const items = module.contentItems;
      return items.length > 0 && items.every((item) => item.contentItem.status === 'ready');
    }).length;
  }
}
