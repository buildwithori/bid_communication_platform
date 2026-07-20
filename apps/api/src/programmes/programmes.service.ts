import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliverableDueType, DeliverableInstanceStatus, DeliverableRequiredScope, ContentItemStatus, Prisma, Programme, ProgrammeAccessType, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RecurringDeliverableService } from '../deliverables/recurring-deliverable.service';
import { cursorArgs, pageSize, toCursorPage } from '../common/pagination/cursor-pagination.dto';
import { ProgrammeQueryDto, ProgrammeLifecycle } from './dto/programme-query.dto';
import { ProgrammeDeliverableRuleQueryDto } from './dto/programme-deliverable-rule-query.dto';
import { ArchiveProgrammeDto, CreateProgrammeDto, UpdateProgrammeDto } from './dto/programme-actions.dto';
import { CreateProgrammeDeliverableRuleDto, UpsertProgrammeDeliverableRuleDto } from './dto/upsert-programme-deliverable-rule.dto';
import { CreateProgrammeModuleDto, MoveProgrammeModuleDto, ProgrammeModuleQueryDto, ReuseProgrammeModuleDto, UpdateProgrammeModuleDto } from './dto/programme-module.dto';

const DEFAULT_TAKE = 20;

const deliverableRuleInclude = {
  dueAfterModule: { select: { id: true, title: true } },
  requiredStage: { select: { id: true, name: true, key: true } },
  _count: { select: { instances: true } },
} satisfies Prisma.ProgrammeDeliverableRuleInclude;

type ProgrammeDeliverableRuleWithInclude = Prisma.ProgrammeDeliverableRuleGetPayload<{
  include: typeof deliverableRuleInclude;
}>;

type ProgrammeListMetrics = {
  content: { total: number; videos: number; pdfs: number; tools: number };
  readyModules: number;
  learnerProgress: { average: number; trackedLearners: number };
  nextLearning: {
    moduleId: string;
    moduleTitle: string;
    contentItemId: string;
    contentTitle: string;
    contentType: string;
    resumePositionSeconds: number | null;
  } | null;
};

type ContentCountRow = {
  programmeId: string;
  type: string;
  count: bigint;
};

type ReadyModuleCountRow = {
  programmeId: string;
  count: bigint;
};

type NextLearningRow = {
  programmeId: string;
  moduleId: string;
  moduleTitle: string;
  contentItemId: string;
  contentTitle: string;
  contentType: string;
  resumePositionSeconds: number | null;
};

type AggregateCountRow = {
  count: bigint;
};

type ModuleContentCountRow = {
  moduleId: string;
  type: string;
  status: string;
  count: bigint;
};

type ModuleContentMetrics = {
  content: { total: number; videos: number; pdfs: number; tools: number };
  readyItems: number;
  learnerProgress: {
    status: 'not_started' | 'in_progress' | 'completed';
    progressPercent: number;
    completedContentCount: number;
    totalContentCount: number;
  } | null;
};

@Injectable()
export class ProgrammesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly recurringDeliverables: RecurringDeliverableService,
  ) {}
  async createProgramme(user: User, dto: CreateProgrammeDto) {
    this.assertAdmin(user);
    const dates = this.programmeDates(dto.startDate, dto.endDate);
    const created = await this.audit.capture(
      {
        action: 'programmes.created',
        entityType: 'programme',
        entityId: ({ id }) => id,
        summary: ({ name }) => `Created programme ${name ?? ''}`.trim(),
      },
      (tx) =>
        tx.programme.create({
          data: {
            name: dto.name.trim(),
            description: dto.description?.trim() ?? '',
            accessType: dto.accessType,
            startDate: dates.startDate,
            endDate: dates.endDate,
            maxEntrepreneurs: dto.maxEntrepreneurs,
            ...(dto.publishState === 'published' ? { publishedAt: new Date(), publishedById: user.id } : {}),
          },
        }),
    );
    return this.getProgramme(user, created.id);
  }

  async updateProgramme(user: User, id: string, dto: UpdateProgrammeDto) {
    this.assertAdmin(user);
    const existing = await this.findProgrammeOrThrow(id);
    if (existing.archivedAt) {
      throw new BadRequestException('Restore this programme before editing it.');
    }
    const dates = this.programmeDates(dto.startDate ?? existing.startDate.toISOString(), dto.endDate ?? existing.endDate.toISOString());
    await this.audit.capture(
      {
        action: 'programmes.updated',
        entityType: 'programme',
        entityId: ({ id: entityId }) => entityId,
        summary: ({ name }) => `Updated programme ${name ?? ''}`.trim(),
      },
      (tx) =>
        tx.programme.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
            ...(dto.accessType !== undefined ? { accessType: dto.accessType } : {}),
            ...(dto.startDate !== undefined ? { startDate: dates.startDate } : {}),
            ...(dto.endDate !== undefined ? { endDate: dates.endDate } : {}),
            ...(dto.maxEntrepreneurs !== undefined ? { maxEntrepreneurs: dto.maxEntrepreneurs } : {}),
          },
        }),
    );
    return this.getProgramme(user, id);
  }

  async publishProgramme(user: User, id: string) {
    this.assertAdmin(user);
    const programme = await this.findProgrammeOrThrow(id);
    if (programme.archivedAt) {
      throw new BadRequestException('Archived programmes cannot be published.');
    }
    if (!programme.publishedAt) {
      await this.audit.capture(
        {
          action: 'programmes.published',
          entityType: 'programme',
          entityId: ({ id: entityId }) => entityId,
          summary: ({ name }) => `Published programme ${name ?? ''}`.trim(),
        },
        (tx) =>
          tx.programme.update({
            where: { id },
            data: { publishedAt: new Date(), publishedById: user.id },
          }),
      );
    }
    return this.getProgramme(user, id);
  }

  async archiveProgramme(user: User, id: string, dto: ArchiveProgrammeDto) {
    this.assertAdmin(user);
    const programme = await this.findProgrammeOrThrow(id);
    if (programme.archivedAt) return this.getProgramme(user, id);
    if (!programme.publishedAt || programme.endDate >= new Date()) {
      throw new BadRequestException('A programme can be archived only after its timeline is completed.');
    }
    await this.audit.capture(
      {
        action: 'programmes.archived',
        entityType: 'programme',
        entityId: ({ id: entityId }) => entityId,
        summary: ({ name }) => `Archived programme ${name ?? ''}`.trim(),
      },
      (tx) =>
        tx.programme.update({
          where: { id },
          data: {
            archivedAt: new Date(),
            archivedById: user.id,
            archiveReason: dto.reason.trim(),
          },
        }),
    );
    return this.getProgramme(user, id);
  }

  async restoreProgramme(user: User, id: string) {
    this.assertAdmin(user);
    const programme = await this.findProgrammeOrThrow(id);
    if (programme.archivedAt) {
      await this.audit.capture(
        {
          action: 'programmes.restored',
          entityType: 'programme',
          entityId: ({ id: entityId }) => entityId,
          summary: ({ name }) => `Restored programme ${name ?? ''}`.trim(),
        },
        (tx) =>
          tx.programme.update({
            where: { id },
            data: { archivedAt: null, archivedById: null, archiveReason: null },
          }),
      );
    }
    return this.getProgramme(user, id);
  }

  async getProgrammeSummary(user: User) {
    const now = new Date();
    const scope = this.programmeScopeWhere(user) ?? {};
    const [totalProgrammes, activeProgrammes, totalModules, activeEnrollment, activeEntrepreneurs, contentTotal, ownedContent, progress] = await Promise.all([
      this.prisma.programme.count({ where: scope }),
      this.prisma.programme.count({
        where: {
          AND: [scope],
          archivedAt: null,
          publishedAt: { not: null },
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
      this.prisma.programmeModule.count({ where: { programme: scope } }),
      this.prisma.programmeAccessGrant.count({
        where: { revokedAt: null, programme: scope },
      }),
      this.prisma.$queryRaw<AggregateCountRow[]>(Prisma.sql`
        SELECT COUNT(DISTINCT pag.entrepreneur_user_id)::bigint AS "count"
        FROM programme_access_grants pag
        WHERE pag.revoked_at IS NULL
        ${
          user.role === UserRole.trainer
            ? Prisma.sql`
              AND EXISTS (
                SELECT 1
                FROM programme_modules pm
                JOIN module_content_items mci ON mci.module_id = pm.module_id
                JOIN content_items ci ON ci.id = mci.content_item_id
                WHERE pm.programme_id = pag.programme_id
                  AND ci.trainer_id = ${user.id}
              )
            `
            : Prisma.empty
        }
      `),
      this.prisma.moduleContentItem.count({
        where: {
          module: { programmes: { some: { programme: scope } } },
        },
      }),
      user.role === UserRole.trainer
        ? this.prisma.contentItem.count({
            where: {
              trainerId: user.id,
              modules: {
                some: {
                  module: { programmes: { some: { programme: scope } } },
                },
              },
            },
          })
        : Promise.resolve(0),
      this.prisma.learnerProgrammeProgress.aggregate({
        where: { programme: scope },
        _avg: { progressPercent: true },
        _count: { _all: true },
      }),
    ]);

    return {
      programmes: { total: totalProgrammes, active: activeProgrammes },
      modules: { total: totalModules },
      enrollment: { active: activeEnrollment },
      entrepreneurs: {
        active: Number(activeEntrepreneurs[0]?.count ?? 0n),
      },
      content: { total: contentTotal, owned: ownedContent },
      learnerProgress: {
        average: Math.round(progress._avg.progressPercent ?? 0),
        trackedLearners: progress._count._all,
      },
    };
  }

  async listProgrammes(user: User, query: ProgrammeQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const where = this.buildProgrammeWhere(user, query);

    const [rows, totalItems] = await Promise.all([
      this.prisma.programme.findMany({
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
        },
      }),
      this.prisma.programme.count({ where }),
    ]);

    const nextCursor = rows.length > take ? (rows[take - 1]?.id ?? null) : null;
    const pageRows = rows.slice(0, take);
    const metrics = await this.programmeListMetrics(
      pageRows.map((programme) => programme.id),
      user,
    );
    const items = pageRows.map((programme) => this.mapProgrammeListItem(programme, metrics.get(programme.id)));

    return { items, nextCursor, totalItems };
  }

  async listProgrammeModules(user: User, programmeId: string, query: ProgrammeModuleQueryDto) {
    if (!(await this.canReadProgramme(user, programmeId))) {
      throw new ForbiddenException('You do not have access to this programme.');
    }

    const take = query.take ?? DEFAULT_TAKE;
    if (query.progressStatus && user.role !== UserRole.entrepreneur) {
      throw new BadRequestException('Module progress filtering is only available to entrepreneurs.');
    }
    const moduleFilters: Prisma.LearningModuleWhereInput[] = [];
    if (query.search?.trim()) {
      const search = query.search.trim();
      moduleFilters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          {
            contentItems: {
              some: {
                contentItem: {
                  title: { contains: search, mode: 'insensitive' },
                  ...(user.role === UserRole.entrepreneur ? { status: ContentItemStatus.ready } : {}),
                },
              },
            },
          },
        ],
      });
    }
    if (query.contentType) {
      moduleFilters.push({
        contentItems: {
          some: {
            contentItem: {
              type: query.contentType,
              ...(user.role === UserRole.entrepreneur ? { status: ContentItemStatus.ready } : {}),
            },
          },
        },
      });
    }
    if (query.progressStatus && user.role === UserRole.entrepreneur) {
      moduleFilters.push(
        query.progressStatus === 'not_started'
          ? {
              OR: [
                {
                  progress: {
                    none: {
                      entrepreneurUserId: user.id,
                      programmeId,
                    },
                  },
                },
                {
                  progress: {
                    some: {
                      entrepreneurUserId: user.id,
                      programmeId,
                      status: 'not_started',
                    },
                  },
                },
              ],
            }
          : {
              progress: {
                some: {
                  entrepreneurUserId: user.id,
                  programmeId,
                  status: query.progressStatus,
                },
              },
            },
      );
    }
    const where: Prisma.ProgrammeModuleWhereInput = {
      programmeId,
      ...(moduleFilters.length ? { module: { AND: moduleFilters } } : {}),
    };
    const [rows, totalItems] = await Promise.all([
      this.prisma.programmeModule.findMany({
        where,
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: {
          module: {
            include: {
              _count: { select: { contentItems: true, programmes: true } },
            },
          },
        },
      }),
      this.prisma.programmeModule.count({ where }),
    ]);
    const pageRows = rows.slice(0, take);
    const metrics = await this.moduleContentMetrics(
      pageRows.map((row) => row.moduleId),
      user,
      programmeId,
    );

    return {
      items: pageRows.map((row) => this.mapProgrammeModule(row, metrics.get(row.moduleId))),
      nextCursor: rows.length > take ? (pageRows.at(-1)?.id ?? null) : null,
      totalItems,
    };
  }

  async getProgrammeModule(user: User, programmeId: string, moduleId: string) {
    if (!(await this.canReadProgramme(user, programmeId))) {
      throw new ForbiddenException('You do not have access to this programme.');
    }
    const row = await this.prisma.programmeModule.findUnique({
      where: { programmeId_moduleId: { programmeId, moduleId } },
      include: {
        module: {
          include: {
            _count: { select: { contentItems: true, programmes: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Programme module was not found.');

    const [metrics, previous, next] = await Promise.all([
      this.moduleContentMetrics([moduleId], user, programmeId),
      this.prisma.programmeModule.findFirst({
        where: { programmeId, position: { lt: row.position } },
        orderBy: [{ position: 'desc' }, { id: 'desc' }],
        select: { module: { select: { id: true, title: true } } },
      }),
      this.prisma.programmeModule.findFirst({
        where: { programmeId, position: { gt: row.position } },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { module: { select: { id: true, title: true } } },
      }),
    ]);

    return {
      ...this.mapProgrammeModule(row, metrics.get(moduleId)),
      navigation: {
        previous: previous?.module ?? null,
        next: next?.module ?? null,
      },
    };
  }

  async listReusableModules(user: User, programmeId: string, query: ProgrammeModuleQueryDto) {
    this.assertAdmin(user);
    await this.assertMutableProgramme(programmeId);
    const take = query.take ?? DEFAULT_TAKE;
    const where: Prisma.LearningModuleWhereInput = {
      isReusable: true,
      programmes: { none: { programmeId } },
      ...(query.search?.trim()
        ? {
            OR: [
              {
                title: {
                  contains: query.search.trim(),
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: query.search.trim(),
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };
    const [rows, totalItems] = await Promise.all([
      this.prisma.learningModule.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: {
          _count: { select: { contentItems: true, programmes: true } },
        },
      }),
      this.prisma.learningModule.count({ where }),
    ]);
    const pageRows = rows.slice(0, take);

    return {
      items: pageRows.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        isReusable: module.isReusable,
        contentItems: module._count.contentItems,
        programmeUses: module._count.programmes,
        updatedAt: module.updatedAt.toISOString(),
      })),
      nextCursor: rows.length > take ? (pageRows.at(-1)?.id ?? null) : null,
      totalItems,
    };
  }

  async createProgrammeModule(user: User, programmeId: string, dto: CreateProgrammeModuleDto) {
    this.assertAdmin(user);
    const created = await this.audit.capture(
      {
        action: 'programme_modules.created',
        entityType: 'learning_module',
        entityId: ({ id }) => id,
        summary: ({ name }) => `Created programme module ${name ?? ''}`.trim(),
      },
      async (tx) => {
        await this.assertMutableProgramme(programmeId, tx);
        const maxPosition = await tx.programmeModule.aggregate({
          where: { programmeId },
          _max: { position: true },
        });
        const module = await tx.learningModule.create({
          data: {
            title: dto.title.trim(),
            description: dto.description?.trim() ?? '',
            isReusable: dto.isReusable ?? true,
          },
        });
        await tx.programmeModule.create({
          data: {
            programmeId,
            moduleId: module.id,
            position: (maxPosition._max.position ?? 0) + 1,
          },
        });
        return { ...module, name: module.title };
      },
    );
    return this.getProgrammeModuleSummary(programmeId, created.id);
  }

  async reuseProgrammeModule(user: User, programmeId: string, dto: ReuseProgrammeModuleDto) {
    this.assertAdmin(user);
    const reused = await this.audit.capture(
      {
        action: 'programme_modules.reused',
        entityType: 'learning_module',
        entityId: ({ id }) => id,
        summary: ({ name }) => `Reused programme module ${name ?? ''}`.trim(),
      },
      async (tx) => {
        await this.assertMutableProgramme(programmeId, tx);
        const module = await tx.learningModule.findFirst({
          where: {
            id: dto.moduleId,
            isReusable: true,
            programmes: { none: { programmeId } },
          },
        });
        if (!module) {
          throw new BadRequestException('This reusable module is unavailable or already attached.');
        }
        const maxPosition = await tx.programmeModule.aggregate({
          where: { programmeId },
          _max: { position: true },
        });
        await tx.programmeModule.create({
          data: {
            programmeId,
            moduleId: module.id,
            position: (maxPosition._max.position ?? 0) + 1,
          },
        });
        return { ...module, name: module.title };
      },
    );
    return this.getProgrammeModuleSummary(programmeId, reused.id);
  }

  async updateProgrammeModule(user: User, programmeId: string, moduleId: string, dto: UpdateProgrammeModuleDto) {
    this.assertAdmin(user);
    const updated = await this.audit.capture(
      {
        action: 'programme_modules.updated',
        entityType: 'learning_module',
        entityId: ({ id }) => id,
        summary: ({ name }) => `Updated programme module ${name ?? ''}`.trim(),
      },
      async (tx) => {
        await this.assertMutableProgramme(programmeId, tx);
        const attached = await tx.programmeModule.count({
          where: { programmeId, moduleId },
        });
        if (!attached) throw new NotFoundException('Programme module was not found.');
        const module = await tx.learningModule.update({
          where: { id: moduleId },
          data: {
            ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
            ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
            ...(dto.isReusable !== undefined ? { isReusable: dto.isReusable } : {}),
          },
        });
        return { ...module, name: module.title };
      },
    );
    return this.getProgrammeModuleSummary(programmeId, updated.id);
  }

  async moveProgrammeModule(user: User, programmeId: string, moduleId: string, dto: MoveProgrammeModuleDto) {
    this.assertAdmin(user);
    await this.audit.capture(
      {
        action: 'programme_modules.reordered',
        entityType: 'learning_module',
        entityId: ({ id }) => id,
        summary: ({ name }) => `Reordered programme module ${name ?? ''}`.trim(),
        payload: { targetPosition: dto.position },
      },
      async (tx) => {
        await this.assertMutableProgramme(programmeId, tx);
        const [link, total] = await Promise.all([
          tx.programmeModule.findUnique({
            where: {
              programmeId_moduleId: { programmeId, moduleId },
            },
            include: { module: { select: { title: true } } },
          }),
          tx.programmeModule.count({ where: { programmeId } }),
        ]);
        if (!link) throw new NotFoundException('Programme module was not found.');

        const targetPosition = Math.min(dto.position, total);
        if (targetPosition !== link.position) {
          await tx.$executeRaw(Prisma.sql`
            UPDATE programme_modules
            SET position = -position
            WHERE programme_id = ${programmeId}
          `);
          await tx.$executeRaw(Prisma.sql`
            UPDATE programme_modules
            SET position = CASE
              WHEN id = ${link.id} THEN ${targetPosition}
              WHEN ${link.position} < ${targetPosition}
                AND -position > ${link.position}
                AND -position <= ${targetPosition}
                THEN -position - 1
              WHEN ${link.position} > ${targetPosition}
                AND -position >= ${targetPosition}
                AND -position < ${link.position}
                THEN -position + 1
              ELSE -position
            END
            WHERE programme_id = ${programmeId}
          `);
        }
        return { id: moduleId, name: link.module.title };
      },
    );
    return this.getProgrammeModuleSummary(programmeId, moduleId);
  }

  async listDeliverableRules(user: User, programmeId: string, query: ProgrammeDeliverableRuleQueryDto) {
    if (!(await this.canReadProgramme(user, programmeId))) {
      throw new ForbiddenException('You do not have access to this programme.');
    }

    const take = pageSize(query);
    const where: Prisma.ProgrammeDeliverableRuleWhereInput = {
      programmeId,
      ...(query.search?.trim() ? { name: { contains: query.search.trim(), mode: 'insensitive' } } : {}),
    };
    const [rules, totalItems] = await Promise.all([
      this.prisma.programmeDeliverableRule.findMany({
        where,
        orderBy: [{ active: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: take + 1,
        ...cursorArgs(query.cursor),
        include: this.deliverableRuleInclude(),
      }),
      this.prisma.programmeDeliverableRule.count({ where }),
    ]);
    const page = rules.slice(0, take);
    const submittedGroups = page.length
      ? await this.prisma.deliverableInstance.groupBy({
          by: ['ruleId'],
          where: {
            ruleId: { in: page.map((rule) => rule.id) },
            submissions: { some: {} },
          },
          _count: { _all: true },
        })
      : [];
    const submittedByRule = new Map(submittedGroups.map((group) => [group.ruleId, group._count._all]));

    return {
      ...toCursorPage(rules, take, (rule) => rule.id),
      items: page.map((rule) => this.mapDeliverableRule(rule, submittedByRule.get(rule.id) ?? 0)),
      totalItems,
    };
  }

  async createDeliverableRule(user: User, programmeId: string, dto: CreateProgrammeDeliverableRuleDto) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException('Only admins can manage programme deliverable rules.');
    }

    await this.ensureProgrammeExists(programmeId);
    await this.validateDeliverableRuleInput(programmeId, dto);

    const rule = await this.audit.capture(
      {
        action: 'programme_deliverable_rules.created',
        entityType: 'programme_deliverable_rule',
        entityId: ({ id }) => id,
        summary: ({ name }) => `Created deliverable rule ${name ?? ''}`.trim(),
        payload: { programmeId, dueType: dto.dueType },
      },
      (tx) =>
        tx.programmeDeliverableRule.create({
          data: this.deliverableRuleData(programmeId, dto) as Prisma.ProgrammeDeliverableRuleUncheckedCreateInput,
          include: this.deliverableRuleInclude(),
        }),
    );

    await this.createImmediateDeliverableInstances(rule.id);
    await this.recurringDeliverables.sync(this.prisma);

    return this.getDeliverableRuleResponse(rule.id);
  }

  async updateDeliverableRule(user: User, programmeId: string, ruleId: string, dto: UpsertProgrammeDeliverableRuleDto) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException('Only admins can manage programme deliverable rules.');
    }

    const existing = await this.prisma.programmeDeliverableRule.findFirst({
      where: { id: ruleId, programmeId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Programme deliverable rule was not found.');

    await this.validateDeliverableRuleInput(programmeId, dto, ruleId);

    const updated = await this.audit.capture(
      {
        action: 'programme_deliverable_rules.updated',
        entityType: 'programme_deliverable_rule',
        entityId: ({ id }) => id,
        summary: ({ name }) => `Updated deliverable rule ${name ?? ''}`.trim(),
        payload: { programmeId, ruleId },
      },
      (tx) =>
        tx.programmeDeliverableRule.update({
          where: { id: ruleId },
          data: this.deliverableRuleData(programmeId, dto, true) as Prisma.ProgrammeDeliverableRuleUncheckedUpdateInput,
          include: this.deliverableRuleInclude(),
        }),
    );

    await this.createImmediateDeliverableInstances(ruleId);
    await this.recurringDeliverables.sync(this.prisma);

    return this.getDeliverableRuleResponse(updated.id);
  }

  async getProgramme(user: User, id: string) {
    const programme = await this.prisma.programme.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            modules: true,
            accessGrants: { where: { revokedAt: null } },
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

    const metrics = await this.programmeListMetrics([id], user);
    return this.mapProgrammeDetailSummary(programme, metrics.get(id));
  }

  async getProgrammePlayer(user: User, programmeId: string) {
    const programme = await this.prisma.programme.findUnique({
      where: { id: programmeId },
    });
    if (!programme) throw new NotFoundException('Programme was not found.');
    if (!(await this.canReadProgramme(user, programmeId))) {
      throw new ForbiddenException('You do not have access to this programme.');
    }

    const moduleLinks = await this.prisma.programmeModule.findMany({
      where: { programmeId },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      include: {
        module: {
          include: {
            contentItems: {
              where:
                user.role === UserRole.admin
                  ? undefined
                  : { contentItem: { status: ContentItemStatus.ready } },
              orderBy: [{ position: 'asc' }, { id: 'asc' }],
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
                    videoAsset: {
                      select: { id: true, duration: true, status: true },
                    },
                    fileAssets: {
                      orderBy: { createdAt: 'desc' },
                      take: 1,
                      select: {
                        id: true,
                        originalFilename: true,
                        mimeType: true,
                        sizeBytes: true,
                        status: true,
                      },
                    },
                    toolLink: {
                      include: {
                        tool: { select: { name: true, embeddedUrl: true } },
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

    const moduleIds = moduleLinks.map((link) => link.moduleId);
    const contentIds = moduleLinks.flatMap((link) => link.module.contentItems.map((item) => item.contentItemId));
    const [programmeProgress, moduleProgress, contentProgress] =
      user.role === UserRole.entrepreneur
        ? await Promise.all([
            this.prisma.learnerProgrammeProgress.findUnique({
              where: {
                entrepreneurUserId_programmeId: {
                  entrepreneurUserId: user.id,
                  programmeId,
                },
              },
              select: { status: true, progressPercent: true },
            }),
            this.prisma.learnerModuleProgress.findMany({
              where: {
                entrepreneurUserId: user.id,
                programmeId,
                moduleId: { in: moduleIds },
              },
              select: {
                moduleId: true,
                status: true,
                progressPercent: true,
                completedContentCount: true,
                totalContentCount: true,
              },
            }),
            this.prisma.learnerContentProgress.findMany({
              where: {
                entrepreneurUserId: user.id,
                programmeId,
                contentItemId: { in: contentIds },
              },
              select: {
                moduleId: true,
                contentItemId: true,
                status: true,
                progressPercent: true,
                lastPositionSeconds: true,
                completedAt: true,
              },
            }),
          ])
        : [null, [], []];

    const moduleProgressById = new Map(moduleProgress.map((progress) => [progress.moduleId, progress]));
    const contentProgressByContext = new Map(contentProgress.map((progress) => [progress.moduleId + ':' + progress.contentItemId, progress]));

    const modules = moduleLinks.map((link) => {
      const progress = moduleProgressById.get(link.moduleId);
      return {
        id: link.module.id,
        linkId: link.id,
        title: link.module.title,
        description: link.module.description,
        position: link.position,
        progress:
          user.role === UserRole.entrepreneur
            ? {
                status: progress?.status ?? 'not_started',
                progressPercent: progress?.progressPercent ?? 0,
                completedContentCount: progress?.completedContentCount ?? 0,
                totalContentCount: progress?.totalContentCount ?? link.module.contentItems.length,
              }
            : null,
        items: link.module.contentItems.map((moduleItem) => {
          const item = moduleItem.contentItem;
          const file = item.fileAssets[0] ?? null;
          const itemProgress = contentProgressByContext.get(link.moduleId + ':' + item.id);
          const trainerName = item.trainer ? [item.trainer.firstName, item.trainer.lastName].filter(Boolean).join(' ') || item.trainer.email : null;
          return {
            id: item.id,
            title: item.title,
            type: item.type,
            status: item.status,
            position: moduleItem.position,
            durationSeconds: item.durationSeconds,
            durationLabel: item.durationSeconds ? Math.round(item.durationSeconds / 60) + ' min' : null,
            trainer: item.trainer ? { id: item.trainer.id, name: trainerName } : null,
            video: item.videoAsset
              ? {
                  id: item.videoAsset.id,
                  durationSeconds: item.videoAsset.duration,
                  status: item.videoAsset.status,
                }
              : null,
            file: file
              ? {
                  id: file.id,
                  originalFilename: file.originalFilename,
                  mimeType: file.mimeType,
                  sizeBytes: Number(file.sizeBytes),
                  status: file.status,
                }
              : null,
            toolLink: item.toolLink
              ? {
                  id: item.toolLink.id,
                  toolId: item.toolLink.toolId,
                  source: item.toolLink.source,
                  toolName: item.toolLink.tool?.name ?? null,
                  url: item.toolLink.tool?.embeddedUrl ?? item.toolLink.externalUrl,
                }
              : null,
            progress:
              user.role === UserRole.entrepreneur
                ? {
                    status: itemProgress?.status ?? 'not_started',
                    progressPercent: itemProgress?.progressPercent ?? 0,
                    lastPositionSeconds: itemProgress?.lastPositionSeconds ?? null,
                    completedAt: itemProgress?.completedAt?.toISOString() ?? null,
                  }
                : null,
          };
        }),
      };
    });
    const playlist = modules.flatMap((module) => module.items.map((item) => ({ moduleId: module.id, item })));
    const resume = playlist.find((entry) => entry.item.progress?.status !== 'completed') ?? playlist[0] ?? null;

    return {
      programme: {
        id: programme.id,
        name: programme.name,
        description: programme.description,
        lifecycle: this.lifecycle(programme),
        accessType: programme.accessType,
      },
      viewer: {
        role: user.role,
        canTrackProgress: user.role === UserRole.entrepreneur,
      },
      progress:
        user.role === UserRole.entrepreneur
          ? {
              status: programmeProgress?.status ?? 'not_started',
              progressPercent: programmeProgress?.progressPercent ?? 0,
              completedContentCount: contentProgress.filter((item) => item.status === 'completed').length,
              totalContentCount: playlist.length,
            }
          : null,
      modules,
      resume: resume ? { moduleId: resume.moduleId, contentItemId: resume.item.id } : null,
      summary: {
        modules: modules.length,
        contentItems: playlist.length,
        videos: playlist.filter((entry) => entry.item.type === 'video').length,
        pdfs: playlist.filter((entry) => entry.item.type === 'pdf').length,
        tools: playlist.filter((entry) => entry.item.type === 'tool').length,
      },
    };
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
        ? {
            dueDate: dueType === DeliverableDueType.fixed_date && dto.dueDate ? this.dateOnly(dto.dueDate) : null,
          }
        : {}),
      ...(dueType !== undefined || dto.dueAfterModuleId !== undefined
        ? {
            dueAfterModuleId: dueType === DeliverableDueType.module_completion ? (dto.dueAfterModuleId ?? null) : null,
          }
        : {}),
      ...(dueType !== undefined || dto.recurringCadence !== undefined
        ? {
            recurringCadence: dueType === DeliverableDueType.recurring ? (dto.recurringCadence ?? null) : null,
          }
        : {}),
      ...(requiredForScope !== undefined ? { requiredForScope } : {}),
      ...(requiredForScope !== undefined || dto.requiredStageId !== undefined
        ? {
            requiredStageId: requiredForScope === DeliverableRequiredScope.stage ? (dto.requiredStageId ?? null) : null,
          }
        : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    };
  }

  private async validateDeliverableRuleInput(programmeId: string, dto: CreateProgrammeDeliverableRuleDto | UpsertProgrammeDeliverableRuleDto, currentRuleId?: string) {
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
    const status = dueDate.getTime() < Date.now() ? DeliverableInstanceStatus.overdue : DeliverableInstanceStatus.not_submitted;

    await this.prisma.$transaction(async (tx) => {
      await tx.deliverableInstance.createMany({
        data: entrepreneurIds.map((entrepreneurUserId) => ({
          ruleId: rule.id,
          entrepreneurUserId,
          programmeId: rule.programmeId,
          dueDate,
          status,
        })),
        skipDuplicates: true,
      });

      await tx.deliverableInstance.updateMany({
        where: {
          ruleId: rule.id,
          entrepreneurUserId: { in: entrepreneurIds },
          dueUpdatedAt: null,
          status: {
            in: [DeliverableInstanceStatus.not_submitted, DeliverableInstanceStatus.overdue],
          },
        },
        data: { dueDate, status },
      });
    });
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

  private async getDeliverableRuleResponse(ruleId: string) {
    const [rule, submittedCount] = await Promise.all([
      this.prisma.programmeDeliverableRule.findUniqueOrThrow({
        where: { id: ruleId },
        include: this.deliverableRuleInclude(),
      }),
      this.prisma.deliverableInstance.count({
        where: { ruleId, submissions: { some: {} } },
      }),
    ]);
    return this.mapDeliverableRule(rule, submittedCount);
  }

  private mapDeliverableRule(rule: ProgrammeDeliverableRuleWithInclude, submittedCount = 0) {
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
      assignedCount: rule._count.instances,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  private async getProgrammeModuleSummary(programmeId: string, moduleId: string) {
    const row = await this.prisma.programmeModule.findUnique({
      where: { programmeId_moduleId: { programmeId, moduleId } },
      include: {
        module: {
          include: {
            _count: { select: { contentItems: true, programmes: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Programme module was not found.');
    const metrics = await this.moduleContentMetrics([moduleId]);
    return this.mapProgrammeModule(row, metrics.get(moduleId));
  }

  private mapProgrammeModule(
    row: {
      id: string;
      moduleId: string;
      position: number;
      module: {
        id: string;
        title: string;
        description: string;
        isReusable: boolean;
        updatedAt: Date;
        _count: { contentItems: number; programmes: number };
      };
    },
    metrics?: ModuleContentMetrics,
  ) {
    const content = metrics?.content ?? {
      total: 0,
      videos: 0,
      pdfs: 0,
      tools: 0,
    };
    const readyItems = metrics?.readyItems ?? 0;
    return {
      linkId: row.id,
      id: row.module.id,
      title: row.module.title,
      description: row.module.description,
      isReusable: row.module.isReusable,
      position: row.position,
      programmeUses: row.module._count.programmes,
      content,
      readiness: content.total > 0 && readyItems === content.total ? 'ready' : 'needs_content',
      learnerProgress: metrics?.learnerProgress ?? null,
      updatedAt: row.module.updatedAt.toISOString(),
    };
  }

  private async moduleContentMetrics(moduleIds: string[], user?: User, programmeId?: string) {
    const metrics = new Map<string, ModuleContentMetrics>();
    for (const moduleId of moduleIds) {
      metrics.set(moduleId, {
        content: { total: 0, videos: 0, pdfs: 0, tools: 0 },
        readyItems: 0,
        learnerProgress: null,
      });
    }
    if (moduleIds.length === 0) return metrics;

    const rows = await this.prisma.$queryRaw<ModuleContentCountRow[]>(Prisma.sql`
      SELECT
        mci.module_id AS "moduleId",
        ci.type::text AS "type",
        ci.status::text AS "status",
        COUNT(*)::bigint AS "count"
      FROM module_content_items mci
      JOIN content_items ci ON ci.id = mci.content_item_id
      WHERE mci.module_id IN (${Prisma.join(moduleIds)})
      ${user?.role === UserRole.entrepreneur ? Prisma.sql`AND ci.status::text = ${ContentItemStatus.ready}` : Prisma.empty}
      GROUP BY mci.module_id, ci.type, ci.status
    `);

    for (const row of rows) {
      const value = metrics.get(row.moduleId);
      if (!value) continue;
      const count = Number(row.count);
      value.content.total += count;
      if (row.type === 'video') value.content.videos += count;
      if (row.type === 'pdf') value.content.pdfs += count;
      if (row.type === 'tool') value.content.tools += count;
      if (row.status === 'ready') value.readyItems += count;
    }

    if (user?.role === UserRole.entrepreneur && programmeId) {
      const progressRows = await this.prisma.learnerModuleProgress.findMany({
        where: {
          entrepreneurUserId: user.id,
          programmeId,
          moduleId: { in: moduleIds },
        },
        select: {
          moduleId: true,
          status: true,
          progressPercent: true,
          completedContentCount: true,
          totalContentCount: true,
        },
      });
      for (const row of progressRows) {
        const value = metrics.get(row.moduleId);
        if (!value) continue;
        value.learnerProgress = {
          status: row.status,
          progressPercent: row.progressPercent,
          completedContentCount: row.completedContentCount,
          totalContentCount: row.totalContentCount,
        };
      }
    }
    return metrics;
  }

  private async assertMutableProgramme(programmeId: string, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    const programme = await client.programme.findUnique({
      where: { id: programmeId },
      select: { id: true, archivedAt: true },
    });
    if (!programme) throw new NotFoundException('Programme was not found.');
    if (programme.archivedAt) {
      throw new BadRequestException('Restore this programme before changing its curriculum.');
    }
    return programme;
  }

  private async findProgrammeOrThrow(id: string) {
    const programme = await this.prisma.programme.findUnique({ where: { id } });
    if (!programme) throw new NotFoundException('Programme was not found.');
    return programme;
  }

  private assertAdmin(user: User) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException('Only admins can manage programmes.');
    }
  }

  private programmeDates(startValue: string, endValue: string) {
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      throw new BadRequestException('Programme end date must be on or after its start date.');
    }
    return { startDate, endDate };
  }

  private async ensureProgrammeExists(programmeId: string) {
    const programme = await this.prisma.programme.findUnique({
      where: { id: programmeId },
      select: { id: true },
    });
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
        OR: [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }],
      });
    }

    if (query.accessType) {
      filters.push({ accessType: query.accessType });
    }

    if (query.progressStatus) {
      if (user.role !== UserRole.entrepreneur) {
        throw new BadRequestException('Progress status filtering is only available to entrepreneurs.');
      }
      filters.push(
        query.progressStatus === 'not_started'
          ? {
              OR: [
                { progress: { none: { entrepreneurUserId: user.id } } },
                {
                  progress: {
                    some: {
                      entrepreneurUserId: user.id,
                      status: 'not_started',
                    },
                  },
                },
              ],
            }
          : {
              progress: {
                some: {
                  entrepreneurUserId: user.id,
                  status: query.progressStatus,
                },
              },
            },
      );
    }

    if (query.grantableOnly) {
      filters.push({ publishedAt: { not: null }, archivedAt: null });
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
      return {
        archivedAt: null,
        publishedAt: { not: null },
        startDate: { gt: now },
      };
    }
    if (lifecycle === 'completed') {
      return {
        archivedAt: null,
        publishedAt: { not: null },
        endDate: { lt: now },
      };
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
    },
    metrics?: ProgrammeListMetrics,
  ) {
    const moduleCount = programme._count.modules;
    const readyModuleCount = metrics?.readyModules ?? 0;

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
      content: metrics?.content ?? { total: 0, videos: 0, pdfs: 0, tools: 0 },
      readiness: moduleCount === 0 ? 0 : Math.round((readyModuleCount / moduleCount) * 100),
      learnerProgress: metrics?.learnerProgress ?? {
        average: 0,
        trackedLearners: 0,
      },
      nextLearning: metrics?.nextLearning ?? null,
    };
  }

  private async programmeListMetrics(programmeIds: string[], user: User) {
    const metrics = new Map<string, ProgrammeListMetrics>();
    for (const programmeId of programmeIds) {
      metrics.set(programmeId, {
        content: { total: 0, videos: 0, pdfs: 0, tools: 0 },
        readyModules: 0,
        learnerProgress: { average: 0, trackedLearners: 0 },
        nextLearning: null,
      });
    }
    if (programmeIds.length === 0) return metrics;

    const visibleContent = user.role === UserRole.entrepreneur ? Prisma.sql`AND ci.status::text = 'ready'` : Prisma.empty;
    const [contentRows, readyModuleRows, progressRows, nextLearningRows] = await Promise.all([
      this.prisma.$queryRaw<ContentCountRow[]>(Prisma.sql`
        SELECT pm.programme_id AS "programmeId", ci.type::text AS "type", COUNT(*)::bigint AS "count"
        FROM programme_modules pm
        JOIN module_content_items mci ON mci.module_id = pm.module_id
        JOIN content_items ci ON ci.id = mci.content_item_id
        WHERE pm.programme_id IN (${Prisma.join(programmeIds)})
        ${visibleContent}
        GROUP BY pm.programme_id, ci.type
      `),
      this.prisma.$queryRaw<ReadyModuleCountRow[]>(Prisma.sql`
        SELECT pm.programme_id AS "programmeId", COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM module_content_items mci
            WHERE mci.module_id = pm.module_id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM module_content_items mci
            JOIN content_items ci ON ci.id = mci.content_item_id
            WHERE mci.module_id = pm.module_id AND ci.status::text <> 'ready'
          )
        )::bigint AS "count"
        FROM programme_modules pm
        WHERE pm.programme_id IN (${Prisma.join(programmeIds)})
        GROUP BY pm.programme_id
      `),
      user.role === UserRole.entrepreneur
        ? this.prisma.learnerProgrammeProgress.findMany({
            where: {
              entrepreneurUserId: user.id,
              programmeId: { in: programmeIds },
            },
            select: { programmeId: true, progressPercent: true },
          })
        : this.prisma.learnerProgrammeProgress.groupBy({
            by: ['programmeId'],
            where: { programmeId: { in: programmeIds } },
            _avg: { progressPercent: true },
            _count: { _all: true },
          }),
      user.role === UserRole.entrepreneur
        ? this.prisma.$queryRaw<NextLearningRow[]>(Prisma.sql`
            SELECT
              p.id AS "programmeId",
              next_item."moduleId",
              next_item."moduleTitle",
              next_item."contentItemId",
              next_item."contentTitle",
              next_item."contentType",
              next_item."resumePositionSeconds"
            FROM programmes p
            JOIN LATERAL (
              SELECT
                pm.module_id AS "moduleId",
                m.title AS "moduleTitle",
                ci.id AS "contentItemId",
                ci.title AS "contentTitle",
                ci.type::text AS "contentType",
                lcp.last_position_seconds AS "resumePositionSeconds"
              FROM programme_modules pm
              JOIN modules m ON m.id = pm.module_id
              JOIN module_content_items mci ON mci.module_id = pm.module_id
              JOIN content_items ci ON ci.id = mci.content_item_id
              LEFT JOIN learner_content_progress lcp
                ON lcp.entrepreneur_user_id = ${user.id}
                AND lcp.programme_id = pm.programme_id
                AND lcp.module_id = pm.module_id
                AND lcp.content_item_id = ci.id
              WHERE pm.programme_id = p.id
                AND ci.status::text = 'ready'
                AND (lcp.status IS NULL OR lcp.status::text <> 'completed')
              ORDER BY pm.position ASC, mci.position ASC, mci.id ASC
              LIMIT 1
            ) next_item ON TRUE
            WHERE p.id IN (${Prisma.join(programmeIds)})
          `)
        : Promise.resolve([] as NextLearningRow[]),
    ]);

    for (const row of contentRows) {
      const value = metrics.get(row.programmeId);
      if (!value) continue;
      const count = Number(row.count);
      value.content.total += count;
      if (row.type === 'video') value.content.videos = count;
      if (row.type === 'pdf') value.content.pdfs = count;
      if (row.type === 'tool') value.content.tools = count;
    }
    for (const row of readyModuleRows) {
      const value = metrics.get(row.programmeId);
      if (value) value.readyModules = Number(row.count);
    }
    for (const row of progressRows) {
      const value = metrics.get(row.programmeId);
      if (!value) continue;
      if ('_avg' in row) {
        value.learnerProgress = {
          average: Math.round(row._avg.progressPercent ?? 0),
          trackedLearners: row._count._all,
        };
      } else {
        value.learnerProgress = {
          average: row.progressPercent,
          trackedLearners: 1,
        };
      }
    }
    for (const row of nextLearningRows) {
      const value = metrics.get(row.programmeId);
      if (!value) continue;
      value.nextLearning = {
        moduleId: row.moduleId,
        moduleTitle: row.moduleTitle,
        contentItemId: row.contentItemId,
        contentTitle: row.contentTitle,
        contentType: row.contentType,
        resumePositionSeconds: row.resumePositionSeconds,
      };
    }

    return metrics;
  }

  private mapProgrammeDetailSummary(
    programme: Programme & {
      _count: { modules: number; accessGrants: number };
    },
    metrics?: ProgrammeListMetrics,
  ) {
    const moduleCount = programme._count.modules;
    const readyModuleCount = metrics?.readyModules ?? 0;
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
      modules: {
        total: moduleCount,
        ready: readyModuleCount,
      },
      content: metrics?.content ?? { total: 0, videos: 0, pdfs: 0, tools: 0 },
      readiness: moduleCount === 0 ? 0 : Math.round((readyModuleCount / moduleCount) * 100),
      learnerProgress: metrics?.learnerProgress ?? {
        average: 0,
        trackedLearners: 0,
      },
      nextLearning: metrics?.nextLearning ?? null,
    };
  }

  private lifecycle(programme: Pick<Programme, 'publishedAt' | 'archivedAt' | 'startDate' | 'endDate'>) {
    if (programme.archivedAt) return 'archived';
    if (!programme.publishedAt) return 'draft';
    const now = new Date();
    if (programme.startDate > now) return 'scheduled';
    if (programme.endDate < now) return 'completed';
    return 'active';
  }
}
