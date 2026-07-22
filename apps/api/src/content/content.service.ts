import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AssetStatus,
  ContentItemStatus,
  ContentItemType,
  FileAssetUsage,
  Prisma,
  ProgrammeAccessType,
  ToolLinkSource,
  User,
  UserRole,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { FilesService } from "../files/files.service";
import {
  AttachContentItemDto,
  ContentItemQueryDto,
  MoveModuleContentItemDto,
  UpdateContentItemDto,
} from "./dto/content-query.dto";
import { CreateContentItemDto } from "./dto/create-content-item.dto";
import { UpsertContentRatingDto } from "./dto/upsert-content-rating.dto";

const contentItemInclude = {
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
  toolLink: { include: { tool: true } },
  _count: { select: { modules: true } },
} satisfies Prisma.ContentItemInclude;

type ContentItemWithInclude = Prisma.ContentItemGetPayload<{
  include: typeof contentItemInclude;
}>;

type ContentUsage = {
  modules: number;
  programmes: number;
  position: number | null;
};

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly audit: AuditService,
  ) {}

  async listContentItems(user: User, query: ContentItemQueryDto) {
    this.assertAdmin(user);
    return this.contentPage(query);
  }

  async listModuleContentItems(
    user: User,
    moduleId: string,
    query: ContentItemQueryDto,
  ) {
    await this.assertModuleReadAccess(user, moduleId, query.programmeId);
    return this.moduleContentPage(moduleId, query, user);
  }

  private async assertModuleReadAccess(
    user: User,
    moduleId: string,
    programmeId?: string,
  ) {
    if (user.role === UserRole.admin) {
      await this.ensureModuleExists(moduleId);
      return;
    }

    if (user.role === UserRole.entrepreneur && !programmeId) {
      throw new BadRequestException(
        "Programme context is required for learner module content.",
      );
    }

    const module = await this.prisma.learningModule.findFirst({
      where: {
        id: moduleId,
        programmes: {
          some: {
            ...(programmeId ? { programmeId } : {}),
            programme:
              user.role === UserRole.entrepreneur
                ? {
                    archivedAt: null,
                    publishedAt: { not: null },
                    OR: [
                      { accessType: ProgrammeAccessType.free },
                      {
                        accessGrants: {
                          some: {
                            entrepreneurUserId: user.id,
                            revokedAt: null,
                          },
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
                  },
          },
        },
      },
      select: { id: true },
    });

    if (!module) {
      throw new ForbiddenException(
        "You do not have access to this module content.",
      );
    }
  }

  async createModuleContentItem(
    user: User,
    moduleId: string,
    input: CreateContentItemDto,
  ) {
    this.assertAdmin(user);
    await this.ensureModuleExists(moduleId);
    await this.ensureTrainerExists(input.trainerId);

    if (input.type === ContentItemType.tool) {
      await this.ensureToolSource(input);
    }

    const fileAsset =
      input.type === ContentItemType.pdf || input.type === ContentItemType.excel
        ? await this.filesService.markReadyForUser(
            user,
            input.fileAssetId as string,
            input.type === ContentItemType.excel
              ? FileAssetUsage.content_excel
              : FileAssetUsage.content_pdf,
          )
        : null;
    const videoAsset =
      input.type === ContentItemType.video
        ? await this.ensureVideoAsset(user, input.videoAssetId as string)
        : null;

    const created = await this.audit.capture(
      {
        action: "content_items.created",
        entityType: "content_item",
        entityId: ({ id }) => id,
        summary: ({ name }) => `Created content item ${name ?? ""}`.trim(),
        payload: { moduleId, type: input.type },
      },
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`
          SELECT id FROM modules WHERE id = ${moduleId} FOR UPDATE
        `);
        if (input.toolId) {
          const existingTool = await tx.moduleContentItem.findFirst({
            where: {
              moduleId,
              contentItem: { toolLink: { is: { toolId: input.toolId } } },
            },
            select: { id: true },
          });
          if (existingTool) {
            throw new BadRequestException(
              "This entrepreneur tool is already used in this module.",
            );
          }
        }

        const maxPosition = await tx.moduleContentItem.aggregate({
          where: { moduleId },
          _max: { position: true },
        });

        const contentItem = await tx.contentItem.create({
          data: {
            title: input.title.trim(),
            type: input.type,
            trainerId: input.trainerId || null,
            durationSeconds: input.durationSeconds ?? null,
            status: this.initialContentStatus(input, videoAsset?.status),
          },
        });

        if (videoAsset) {
          const attached = await tx.videoAsset.updateMany({
            where: { id: videoAsset.id, contentItemId: null },
            data: { contentItemId: contentItem.id },
          });
          if (attached.count !== 1) {
            throw new BadRequestException(
              "This video upload is already attached.",
            );
          }
        }

        if (fileAsset) {
          await tx.fileAsset.update({
            where: { id: fileAsset.id },
            data: {
              contentItemId: contentItem.id,
              status: AssetStatus.ready,
            },
          });
        }

        if (input.type === ContentItemType.tool) {
          await tx.contentToolLink.create({
            data: {
              contentItemId: contentItem.id,
              toolId: input.toolId || null,
              externalUrl: input.externalUrl?.trim() || null,
              source: input.toolId
                ? ToolLinkSource.library
                : ToolLinkSource.custom,
            },
          });
        }

        await tx.moduleContentItem.create({
          data: {
            moduleId,
            contentItemId: contentItem.id,
            position: (maxPosition._max.position ?? 0) + 1,
          },
        });

        return { ...contentItem, name: contentItem.title };
      },
    );

    return this.getContentItem(created.id, moduleId);
  }

  async updateContentItem(
    user: User,
    contentItemId: string,
    input: UpdateContentItemDto,
  ) {
    this.assertAdmin(user);
    await this.ensureTrainerExists(input.trainerId);

    const updated = await this.audit.capture(
      {
        action: "content_items.updated",
        entityType: "content_item",
        entityId: ({ id }) => id,
        summary: ({ name }) => `Updated content item ${name ?? ""}`.trim(),
      },
      async (tx) => {
        const existing = await tx.contentItem.findUnique({
          where: { id: contentItemId },
          select: { id: true },
        });
        if (!existing)
          throw new NotFoundException("Content item was not found.");

        const item = await tx.contentItem.update({
          where: { id: contentItemId },
          data: {
            ...(input.title !== undefined ? { title: input.title.trim() } : {}),
            ...(input.trainerId !== undefined
              ? { trainerId: input.trainerId || null }
              : {}),
          },
        });
        return { ...item, name: item.title };
      },
    );

    return this.getContentItem(updated.id);
  }

  async attachModuleContentItem(
    user: User,
    moduleId: string,
    input: AttachContentItemDto,
  ) {
    this.assertAdmin(user);

    await this.audit.capture(
      {
        action: "content_items.attached",
        entityType: "content_item",
        entityId: ({ id }) => id,
        summary: ({ name }) => `Attached content item ${name ?? ""}`.trim(),
        payload: { moduleId },
      },
      async (tx) => {
        const [module, contentItem] = await Promise.all([
          tx.learningModule.findUnique({
            where: { id: moduleId },
            select: {
              id: true,
              programmes: { select: { programmeId: true } },
            },
          }),
          tx.contentItem.findUnique({
            where: { id: input.contentItemId },
            select: {
              id: true,
              title: true,
              toolLink: { select: { toolId: true } },
            },
          }),
        ]);

        if (!module) throw new NotFoundException("Module was not found.");
        if (!contentItem) {
          throw new NotFoundException("Content item was not found.");
        }

        await tx.$queryRaw(Prisma.sql`
          SELECT id FROM modules WHERE id = ${moduleId} FOR UPDATE
        `);

        const programmeIds = module.programmes
          .map((link) => link.programmeId)
          .sort();
        if (programmeIds.length) {
          await tx.$queryRaw(Prisma.sql`
            SELECT id
            FROM programmes
            WHERE id IN (${Prisma.join(programmeIds)})
            ORDER BY id
            FOR UPDATE
          `);
        }
        const existing = await tx.moduleContentItem.findFirst({
          where: {
            contentItemId: input.contentItemId,
            OR: [
              { moduleId },
              ...(programmeIds.length
                ? [
                    {
                      module: {
                        programmes: {
                          some: { programmeId: { in: programmeIds } },
                        },
                      },
                    },
                  ]
                : []),
            ],
          },
          select: { moduleId: true },
        });
        if (existing) {
          throw new BadRequestException(
            existing.moduleId === moduleId
              ? "This content item is already attached to the module."
              : "This content item is already used in a programme connected to this module.",
          );
        }
        if (contentItem.toolLink?.toolId) {
          const existingTool = await tx.moduleContentItem.findFirst({
            where: {
              moduleId,
              contentItem: {
                toolLink: { is: { toolId: contentItem.toolLink.toolId } },
              },
            },
            select: { id: true },
          });
          if (existingTool) {
            throw new BadRequestException(
              "This entrepreneur tool is already used in this module.",
            );
          }
        }

        const maxPosition = await tx.moduleContentItem.aggregate({
          where: { moduleId },
          _max: { position: true },
        });

        await tx.moduleContentItem.create({
          data: {
            moduleId,
            contentItemId: contentItem.id,
            position: (maxPosition._max.position ?? 0) + 1,
          },
        });
        return { id: contentItem.id, name: contentItem.title };
      },
    );

    return this.getContentItem(input.contentItemId, moduleId);
  }

  async moveModuleContentItem(
    user: User,
    moduleId: string,
    contentItemId: string,
    input: MoveModuleContentItemDto,
  ) {
    this.assertAdmin(user);

    await this.audit.capture(
      {
        action: "content_items.reordered",
        entityType: "content_item",
        entityId: ({ id }) => id,
        summary: ({ name }) => `Reordered content item ${name ?? ""}`.trim(),
        payload: { moduleId, targetPosition: input.position },
      },
      async (tx) => {
        const [link, total] = await Promise.all([
          tx.moduleContentItem.findUnique({
            where: {
              moduleId_contentItemId: { moduleId, contentItemId },
            },
            include: { contentItem: { select: { title: true } } },
          }),
          tx.moduleContentItem.count({ where: { moduleId } }),
        ]);
        if (!link) {
          throw new NotFoundException("Module content item was not found.");
        }

        const targetPosition = Math.min(input.position, total);
        if (targetPosition !== link.position) {
          await tx.$executeRaw(Prisma.sql`
            UPDATE module_content_items
            SET position = -position
            WHERE module_id = ${moduleId}
          `);
          await tx.$executeRaw(Prisma.sql`
            UPDATE module_content_items
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
            WHERE module_id = ${moduleId}
          `);
        }

        return { id: contentItemId, name: link.contentItem.title };
      },
    );

    return this.getContentItem(contentItemId, moduleId);
  }

  async getMyRating(user: User, contentItemId: string) {
    this.assertEntrepreneur(user);
    await this.assertContentReadAccess(user, contentItemId);

    const rating = await this.prisma.contentRating.findUnique({
      where: {
        contentItemId_entrepreneurUserId: {
          contentItemId,
          entrepreneurUserId: user.id,
        },
      },
    });

    return rating ? this.serializeRating(rating) : null;
  }

  async upsertRating(user: User, input: UpsertContentRatingDto) {
    this.assertEntrepreneur(user);
    await this.assertContentReadAccess(user, input.contentItemId);

    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: input.contentItemId },
      select: { id: true, trainerId: true },
    });
    if (!contentItem) throw new NotFoundException("Content item not found.");

    const comment = input.comment?.trim() || null;
    const rating = await this.prisma.contentRating.upsert({
      where: {
        contentItemId_entrepreneurUserId: {
          contentItemId: input.contentItemId,
          entrepreneurUserId: user.id,
        },
      },
      create: {
        contentItemId: input.contentItemId,
        entrepreneurUserId: user.id,
        trainerId: contentItem.trainerId,
        rating: input.rating,
        comment,
      },
      update: {
        trainerId: contentItem.trainerId,
        rating: input.rating,
        comment,
      },
    });

    return this.serializeRating(rating);
  }

  private async moduleContentPage(
    moduleId: string,
    query: ContentItemQueryDto,
    user: User,
  ) {
    const take = query.take ?? 20;
    const contentWhere = this.contentWhere({
      ...query,
      ...(user.role === UserRole.entrepreneur
        ? { status: ContentItemStatus.ready }
        : {}),
      moduleId: undefined,
      excludeModuleId: undefined,
      reusableForModuleId: undefined,
    });
    const where: Prisma.ModuleContentItemWhereInput = {
      moduleId,
      contentItem: contentWhere,
    };

    const [rows, totalItems, grouped] = await Promise.all([
      this.prisma.moduleContentItem.findMany({
        where,
        include: { contentItem: { include: contentItemInclude } },
        orderBy: { position: "asc" },
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
      this.prisma.moduleContentItem.count({ where }),
      this.prisma.contentItem.groupBy({
        by: ["type"],
        where: {
          ...this.contentWhere({
            ...query,
            ...(user.role === UserRole.entrepreneur
              ? { status: ContentItemStatus.ready }
              : {}),
            type: undefined,
            moduleId: undefined,
            excludeModuleId: undefined,
            reusableForModuleId: undefined,
          }),
          modules: { some: { moduleId } },
        },
        _count: { id: true },
      }),
    ]);

    const pageRows = rows.slice(0, take);
    const contentItemIds = pageRows.map((row) => row.contentItemId);
    const [usage, learnerProgressRows] = await Promise.all([
      this.contentUsage(contentItemIds, moduleId),
      user.role === UserRole.entrepreneur && query.programmeId
        ? this.prisma.learnerContentProgress.findMany({
            where: {
              entrepreneurUserId: user.id,
              programmeId: query.programmeId,
              moduleId,
              contentItemId: { in: contentItemIds },
            },
            select: {
              contentItemId: true,
              status: true,
              progressPercent: true,
              lastPositionSeconds: true,
              completedAt: true,
            },
          })
        : Promise.resolve([]),
    ]);
    const learnerProgress = new Map(
      learnerProgressRows.map((row) => [row.contentItemId, row]),
    );
    const counts = { video: 0, pdf: 0, excel: 0, tool: 0 };
    for (const row of grouped) counts[row.type] = row._count.id;

    return {
      items: pageRows.map((row) =>
        this.serializeContentItem(
          row.contentItem,
          {
            ...(usage.get(row.contentItemId) ?? {
              modules: row.contentItem._count.modules,
              programmes: 0,
              position: row.position,
            }),
            position: row.position,
          },
          learnerProgress.get(row.contentItemId),
        ),
      ),
      nextCursor:
        rows.length > take ? (pageRows[pageRows.length - 1]?.id ?? null) : null,
      totalItems,
      summary: {
        total: counts.video + counts.pdf + counts.excel + counts.tool,
        ...counts,
      },
    };
  }

  private async contentPage(query: ContentItemQueryDto) {
    const take = query.take ?? 20;
    const where = this.contentWhere(query);
    const summaryWhere = this.contentWhere({ ...query, type: undefined });

    const [rows, totalItems, grouped] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        include: contentItemInclude,
        orderBy: { id: "desc" },
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
      this.prisma.contentItem.count({ where }),
      this.prisma.contentItem.groupBy({
        by: ["type"],
        where: summaryWhere,
        _count: { id: true },
      }),
    ]);

    const items = rows.slice(0, take);
    const usage = await this.contentUsage(
      items.map((item) => item.id),
      query.moduleId,
    );
    const counts = {
      video: 0,
      pdf: 0,
      excel: 0,
      tool: 0,
    };
    for (const row of grouped) {
      counts[row.type] = row._count.id;
    }

    return {
      items: items.map((item) =>
        this.serializeContentItem(item, usage.get(item.id)),
      ),
      nextCursor:
        rows.length > take ? (items[items.length - 1]?.id ?? null) : null,
      totalItems,
      summary: {
        total: counts.video + counts.pdf + counts.excel + counts.tool,
        ...counts,
      },
    };
  }

  private contentWhere(
    query: ContentItemQueryDto,
  ): Prisma.ContentItemWhereInput {
    const search = query.search?.trim();
    return {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.trainerId ? { trainerId: query.trainerId } : {}),
      ...(query.moduleId
        ? { modules: { some: { moduleId: query.moduleId } } }
        : {}),
      ...(query.excludeModuleId
        ? {
            AND: [
              { modules: { none: { moduleId: query.excludeModuleId } } },
              {
                NOT: {
                  toolLink: {
                    is: {
                      toolId: { not: null },
                      tool: {
                        contentLinks: {
                          some: {
                            contentItem: {
                              modules: {
                                some: { moduleId: query.excludeModuleId },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(query.reusableForModuleId
        ? {
            modules: {
              none: {
                module: {
                  programmes: {
                    some: {
                      programme: {
                        modules: {
                          some: { moduleId: query.reusableForModuleId },
                        },
                      },
                    },
                  },
                },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              {
                trainer: {
                  is: {
                    OR: [
                      {
                        firstName: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                      {
                        lastName: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                      {
                        email: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  private async getContentItem(contentItemId: string, moduleId?: string) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: contentItemInclude,
    });
    if (!item) throw new NotFoundException("Content item was not found.");
    const usage = await this.contentUsage([contentItemId], moduleId);
    return this.serializeContentItem(item, usage.get(contentItemId));
  }

  private async contentUsage(
    contentItemIds: string[],
    scopedModuleId?: string,
  ) {
    const result = new Map<string, ContentUsage>();
    if (!contentItemIds.length) return result;

    const placements = await this.prisma.moduleContentItem.findMany({
      where: { contentItemId: { in: contentItemIds } },
      select: { contentItemId: true, moduleId: true, position: true },
    });
    const moduleIds = [...new Set(placements.map((row) => row.moduleId))];
    const programmeLinks = moduleIds.length
      ? await this.prisma.programmeModule.findMany({
          where: { moduleId: { in: moduleIds } },
          select: { moduleId: true, programmeId: true },
        })
      : [];

    const programmesByModule = new Map<string, Set<string>>();
    for (const link of programmeLinks) {
      const programmeIds =
        programmesByModule.get(link.moduleId) ?? new Set<string>();
      programmeIds.add(link.programmeId);
      programmesByModule.set(link.moduleId, programmeIds);
    }

    for (const contentItemId of contentItemIds) {
      const contentPlacements = placements.filter(
        (placement) => placement.contentItemId === contentItemId,
      );
      const programmeIds = new Set<string>();
      for (const placement of contentPlacements) {
        for (const programmeId of programmesByModule.get(placement.moduleId) ??
          []) {
          programmeIds.add(programmeId);
        }
      }
      result.set(contentItemId, {
        modules: contentPlacements.length,
        programmes: programmeIds.size,
        position:
          contentPlacements.find(
            (placement) => placement.moduleId === scopedModuleId,
          )?.position ?? null,
      });
    }

    return result;
  }

  private async assertContentReadAccess(user: User, contentItemId: string) {
    const content = await this.prisma.contentItem.findFirst({
      where: {
        id: contentItemId,
        status: ContentItemStatus.ready,
        modules: {
          some: {
            module: {
              programmes: {
                some: {
                  programme: {
                    archivedAt: null,
                    publishedAt: { not: null },
                    OR: [
                      { accessType: ProgrammeAccessType.free },
                      {
                        accessGrants: {
                          some: {
                            entrepreneurUserId: user.id,
                            revokedAt: null,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    if (!content) {
      throw new ForbiddenException(
        "You do not have access to this learning content.",
      );
    }
  }

  private async ensureModuleExists(moduleId: string) {
    const module = await this.prisma.learningModule.findUnique({
      where: { id: moduleId },
      select: { id: true },
    });
    if (!module) throw new NotFoundException("Module was not found.");
  }

  private async ensureTrainerExists(trainerId?: string) {
    if (!trainerId) return;
    const trainer = await this.prisma.user.findFirst({
      where: { id: trainerId, role: UserRole.trainer },
      select: { id: true },
    });
    if (!trainer) throw new NotFoundException("Trainer was not found.");
  }

  private async ensureVideoAsset(user: User, videoAssetId: string) {
    const video = await this.prisma.videoAsset.findUnique({
      where: { id: videoAssetId },
    });
    if (!video) throw new NotFoundException("Uploaded video was not found.");
    if (video.uploadedById !== user.id || video.contentItemId) {
      throw new ForbiddenException(
        "Uploaded video is not in your upload scope.",
      );
    }
    if (
      video.status === AssetStatus.failed ||
      video.status === AssetStatus.archived
    ) {
      throw new BadRequestException(
        "Upload a valid video before creating this content item.",
      );
    }
    return video;
  }

  private async ensureToolSource(input: CreateContentItemDto) {
    if (input.toolId) {
      const tool = await this.prisma.tool.findUnique({
        where: { id: input.toolId },
        select: {
          id: true,
          type: true,
          status: true,
          embeddedUrl: true,
          fileAssetId: true,
        },
      });
      if (!tool) throw new NotFoundException("Tool was not found.");
      if (tool.status !== "published") {
        throw new ForbiddenException(
          "Only published entrepreneur tools can be attached to learning content.",
        );
      }
      if (
        (tool.type === "embedded_tool" && !tool.embeddedUrl) ||
        ((tool.type === "pdf" || tool.type === "excel") && !tool.fileAssetId)
      ) {
        throw new ForbiddenException(
          "This entrepreneur tool does not have a previewable resource.",
        );
      }
      return;
    }

    if (!input.externalUrl?.trim()) {
      throw new ForbiddenException(
        "Choose an existing tool or add an embedded tool link.",
      );
    }
  }

  private initialContentStatus(
    input: CreateContentItemDto,
    videoStatus?: AssetStatus,
  ) {
    if (input.type === ContentItemType.video) {
      if (videoStatus === AssetStatus.ready) return ContentItemStatus.ready;
      if (videoStatus === AssetStatus.failed) return ContentItemStatus.failed;
      return ContentItemStatus.processing;
    }
    return ContentItemStatus.ready;
  }

  private serializeContentItem(
    item: ContentItemWithInclude,
    usage?: ContentUsage,
    learnerProgress?: {
      status: "not_started" | "in_progress" | "completed";
      progressPercent: number;
      lastPositionSeconds: number | null;
      completedAt: Date | null;
    },
  ) {
    const file = item.fileAssets[0] ?? null;
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      trainerId: item.trainerId,
      trainer: item.trainer ? this.serializeUser(item.trainer) : null,
      durationSeconds: item.durationSeconds,
      durationLabel: item.durationSeconds
        ? `${Math.round(item.durationSeconds / 60)} min`
        : null,
      status: item.status,
      video: item.videoAsset
        ? {
            id: item.videoAsset.id,
            durationSeconds: item.videoAsset.duration,
            status: item.videoAsset.status,
            failureReason: item.videoAsset.failureReason,
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
            externalUrl: item.toolLink.externalUrl,
            source: item.toolLink.source,
            toolName: item.toolLink.tool?.name ?? null,
            toolType: item.toolLink.tool?.type ?? null,
            fileId: item.toolLink.tool?.fileAssetId ?? null,
            url: item.toolLink.tool?.embeddedUrl ?? item.toolLink.externalUrl,
          }
        : null,
      usage: usage ?? {
        modules: item._count.modules,
        programmes: 0,
        position: null,
      },
      learnerProgress: learnerProgress
        ? {
            status: learnerProgress.status,
            progressPercent: learnerProgress.progressPercent,
            lastPositionSeconds: learnerProgress.lastPositionSeconds,
            completedAt: learnerProgress.completedAt?.toISOString() ?? null,
          }
        : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private serializeUser(user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  }) {
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    return { id: user.id, name, email: user.email };
  }

  private assertAdmin(user: User) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException("Only admins can manage content.");
    }
  }

  private assertEntrepreneur(user: User) {
    if (user.role !== UserRole.entrepreneur) {
      throw new ForbiddenException(
        "Only entrepreneurs can rate learning content.",
      );
    }
  }

  private serializeRating(rating: {
    id: string;
    contentItemId: string;
    entrepreneurUserId: string;
    trainerId: string | null;
    rating: number;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: rating.id,
      contentItemId: rating.contentItemId,
      entrepreneurUserId: rating.entrepreneurUserId,
      trainerId: rating.trainerId,
      rating: rating.rating,
      comment: rating.comment,
      createdAt: rating.createdAt.toISOString(),
      updatedAt: rating.updatedAt.toISOString(),
    };
  }
}
