import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EntrepreneurToolStatus,
  EntrepreneurToolType,
  EntrepreneurToolVisibility,
  FileAssetUsage,
  Prisma,
  User,
  UserRole,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { FilesService } from "../files/files.service";
import { StorageService } from "../files/storage.service";
import { ToolQueryDto } from "./dto/tool-query.dto";
import { CreateToolDto, UpsertToolDto } from "./dto/upsert-tool.dto";

const DEFAULT_TAKE = 20;

const toolInclude = {
  toolArea: { select: { id: true, name: true, key: true } },
  fileAsset: {
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      storageKey: true,
    },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  updatedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  programmeAccess: {
    select: {
      programmeId: true,
      programme: { select: { name: true } },
    },
  },
  entrepreneurAccess: {
    select: {
      entrepreneurUserId: true,
      entrepreneur: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          businessMemberships: {
            where: { isPrimary: true },
            take: 1,
            select: { business: { select: { name: true } } },
          },
        },
      },
    },
  },
  hiddenEntrepreneurs: {
    select: {
      entrepreneurUserId: true,
      entrepreneur: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          businessMemberships: {
            where: { isPrimary: true },
            take: 1,
            select: { business: { select: { name: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.ToolInclude;

type ToolWithInclude = Prisma.ToolGetPayload<{ include: typeof toolInclude }>;

@Injectable()
export class ToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly files: FilesService,
  ) {}

  async listTools(user: User, query: ToolQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const where = this.buildToolWhere(user, query);
    const scope = this.readScopeWhere(user);
    const [
      rows,
      totalItems,
      published,
      drafts,
      archived,
      global,
      programmeTargeted,
      entrepreneurTargeted,
    ] = await this.prisma.$transaction([
      this.prisma.tool.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: toolInclude,
      }),
      this.prisma.tool.count({ where }),
      this.prisma.tool.count({
        where: { AND: [scope, { status: EntrepreneurToolStatus.published }] },
      }),
      this.prisma.tool.count({
        where: { AND: [scope, { status: EntrepreneurToolStatus.draft }] },
      }),
      this.prisma.tool.count({
        where: { AND: [scope, { status: EntrepreneurToolStatus.archived }] },
      }),
      this.prisma.tool.count({
        where: {
          AND: [
            scope,
            { visibility: EntrepreneurToolVisibility.all_entrepreneurs },
          ],
        },
      }),
      this.prisma.tool.count({
        where: {
          AND: [scope, { visibility: EntrepreneurToolVisibility.programmes }],
        },
      }),
      this.prisma.tool.count({
        where: {
          AND: [
            scope,
            { visibility: EntrepreneurToolVisibility.entrepreneurs },
          ],
        },
      }),
    ]);

    const nextCursor = rows.length > take ? (rows[take - 1]?.id ?? null) : null;
    return {
      items: rows
        .slice(0, take)
        .map((tool) => this.mapTool(tool, user.role === UserRole.admin)),
      nextCursor,
      totalItems,
      summary: {
        statuses: { published, draft: drafts, archived },
        visibility: {
          allEntrepreneurs: global,
          programmes: programmeTargeted,
          entrepreneurs: entrepreneurTargeted,
        },
      },
    };
  }

  async getTool(user: User, id: string) {
    const tool = await this.prisma.tool.findFirst({
      where: { id, ...this.readScopeWhere(user) },
      include: toolInclude,
    });

    if (!tool) throw new NotFoundException("Tool was not found.");
    return this.mapTool(tool, user.role === UserRole.admin);
  }

  async listEntrepreneurTools(entrepreneurUserId: string, query: ToolQueryDto) {
    await this.ensureEntrepreneursExist([entrepreneurUserId]);
    const take = query.take ?? DEFAULT_TAKE;
    const programmeMatch: Prisma.ToolProgrammeAccessWhereInput = {
      programme: {
        OR: [
          { accessType: "free" },
          { accessGrants: { some: { entrepreneurUserId, revokedAt: null } } },
        ],
      },
    };
    const effectiveAccess: Prisma.ToolWhereInput = {
      hiddenEntrepreneurs: { none: { entrepreneurUserId } },
      OR: [
        { visibility: EntrepreneurToolVisibility.all_entrepreneurs },
        { programmeAccess: { some: programmeMatch } },
        { entrepreneurAccess: { some: { entrepreneurUserId } } },
      ],
    };
    const where: Prisma.ToolWhereInput = {
      AND: [
        {
          status: EntrepreneurToolStatus.published,
          archivedAt: null,
        },
        ...(query.includeUnavailable ? [] : [effectiveAccess]),
        ...(query.search?.trim()
          ? [
              {
                OR: [
                  {
                    name: {
                      contains: query.search.trim(),
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    description: {
                      contains: query.search.trim(),
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    toolArea: {
                      name: {
                        contains: query.search.trim(),
                        mode: "insensitive" as const,
                      },
                    },
                  },
                ],
              },
            ]
          : []),
        ...(query.type ? [{ type: query.type }] : []),
        ...(query.toolAreaId ? [{ toolAreaId: query.toolAreaId }] : []),
      ],
    };
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.tool.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          iconKey: true,
          visibility: true,
          toolArea: { select: { id: true, name: true, key: true } },
          entrepreneurAccess: {
            where: { entrepreneurUserId },
            select: { id: true },
          },
          hiddenEntrepreneurs: {
            where: { entrepreneurUserId },
            select: { id: true },
          },
          programmeAccess: {
            where: programmeMatch,
            select: { id: true },
          },
        },
      }),
      this.prisma.tool.count({ where }),
    ]);
    const items = rows.slice(0, take);
    return {
      items: items.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        type: tool.type,
        iconKey: tool.iconKey,
        visibility: tool.visibility,
        toolArea: tool.toolArea,
        accessSource:
          tool.entrepreneurAccess.length > 0
            ? "individual"
            : tool.visibility === EntrepreneurToolVisibility.all_entrepreneurs
              ? "global"
              : tool.programmeAccess.length > 0
                ? "programme"
                : "none",
        directGranted: tool.entrepreneurAccess.length > 0,
        hidden: tool.hiddenEntrepreneurs.length > 0,
        visible:
          tool.hiddenEntrepreneurs.length === 0 &&
          (tool.entrepreneurAccess.length > 0 ||
            tool.visibility === EntrepreneurToolVisibility.all_entrepreneurs ||
            tool.programmeAccess.length > 0),
      })),
      nextCursor:
        rows.length > take ? (items[items.length - 1]?.id ?? null) : null,
      totalItems,
    };
  }

  async grantEntrepreneurAccess(
    user: User,
    toolId: string,
    entrepreneurUserId: string,
  ) {
    const tool = await this.ensureManageableTool(toolId);
    await this.ensureEntrepreneursExist([entrepreneurUserId]);
    await this.audit.capture(
      {
        action: "tools.entrepreneur-access.granted",
        entityType: "entrepreneurToolAccess",
        entityId: ({ id }) => id,
        summary: `Granted ${tool.name} to entrepreneur`,
        payload: { toolId, entrepreneurUserId },
      },
      async (tx) => {
        await tx.toolEntrepreneurAccess.upsert({
          where: { toolId_entrepreneurUserId: { toolId, entrepreneurUserId } },
          create: { toolId, entrepreneurUserId, grantedById: user.id },
          update: { grantedById: user.id, grantedAt: new Date() },
        });
        await tx.toolHiddenEntrepreneur.deleteMany({
          where: { toolId, entrepreneurUserId },
        });
        return { id: `${toolId}:${entrepreneurUserId}` };
      },
    );
    return { ok: true };
  }

  async revokeEntrepreneurAccess(toolId: string, entrepreneurUserId: string) {
    const tool = await this.ensureManageableTool(toolId);
    await this.ensureEntrepreneursExist([entrepreneurUserId]);
    await this.captureAccessChange(
      "tools.entrepreneur-access.revoked",
      `Revoked direct access to ${tool.name}`,
      toolId,
      entrepreneurUserId,
      (tx) =>
        tx.toolEntrepreneurAccess.deleteMany({
          where: { toolId, entrepreneurUserId },
        }),
    );
    return { ok: true };
  }

  async hideFromEntrepreneur(
    user: User,
    toolId: string,
    entrepreneurUserId: string,
  ) {
    const tool = await this.ensureManageableTool(toolId);
    await this.ensureEntrepreneursExist([entrepreneurUserId]);
    await this.audit.capture(
      {
        action: "tools.entrepreneur-access.hidden",
        entityType: "entrepreneurToolAccess",
        entityId: ({ id }) => id,
        summary: `Hid ${tool.name} from entrepreneur`,
        payload: { toolId, entrepreneurUserId },
      },
      async (tx) => {
        await tx.toolHiddenEntrepreneur.upsert({
          where: { toolId_entrepreneurUserId: { toolId, entrepreneurUserId } },
          create: { toolId, entrepreneurUserId, hiddenById: user.id },
          update: { hiddenById: user.id, hiddenAt: new Date() },
        });
        return { id: `${toolId}:${entrepreneurUserId}` };
      },
    );
    return { ok: true };
  }

  async restoreForEntrepreneur(toolId: string, entrepreneurUserId: string) {
    const tool = await this.ensureManageableTool(toolId);
    await this.ensureEntrepreneursExist([entrepreneurUserId]);
    await this.captureAccessChange(
      "tools.entrepreneur-access.restored",
      `Restored ${tool.name} for entrepreneur`,
      toolId,
      entrepreneurUserId,
      (tx) =>
        tx.toolHiddenEntrepreneur.deleteMany({
          where: { toolId, entrepreneurUserId },
        }),
    );
    return { ok: true };
  }

  async createTool(user: User, dto: CreateToolDto) {
    await this.validateToolPayload(dto, dto);
    if (dto.fileAssetId) {
      await this.files.markReadyForUser(
        user,
        dto.fileAssetId,
        dto.type === EntrepreneurToolType.excel
          ? FileAssetUsage.tool_excel
          : FileAssetUsage.tool_pdf,
      );
    }

    const created = await this.audit.capture(
      {
        action: "tools.created",
        entityType: "tool",
        entityId: ({ id }) => id,
        summary: ({ name }) => `Created tool ${name ?? ""}`.trim(),
        payload: {
          type: dto.type,
          visibility: dto.visibility,
          status: dto.status,
        },
      },
      async (tx) => {
        const tool = await tx.tool.create({
          data: {
            name: dto.name.trim(),
            description: dto.description.trim(),
            type: dto.type,
            toolAreaId: dto.toolAreaId,
            iconKey: dto.iconKey.trim(),
            visibility: dto.visibility,
            status: dto.status,
            fileAssetId: dto.fileAssetId || null,
            embeddedUrl: dto.embeddedUrl?.trim() || null,
            createdById: user.id,
            publishedAt:
              dto.status === EntrepreneurToolStatus.published
                ? new Date()
                : null,
            archivedAt:
              dto.status === EntrepreneurToolStatus.archived
                ? new Date()
                : null,
          },
        });

        await this.replaceAudience(tx, tool.id, user.id, dto);
        return tool;
      },
    );

    return this.getTool(user, created.id);
  }

  async updateTool(user: User, id: string, dto: UpsertToolDto) {
    const existing = await this.prisma.tool.findUnique({
      where: { id },
      include: {
        programmeAccess: { select: { programmeId: true } },
        entrepreneurAccess: { select: { entrepreneurUserId: true } },
        hiddenEntrepreneurs: { select: { entrepreneurUserId: true } },
      },
    });
    if (!existing) throw new NotFoundException("Tool was not found.");

    const merged = {
      ...existing,
      ...dto,
      programmeIds:
        dto.programmeIds ??
        existing.programmeAccess.map((access) => access.programmeId),
      entrepreneurUserIds:
        dto.entrepreneurUserIds ??
        existing.entrepreneurAccess.map((access) => access.entrepreneurUserId),
      hiddenEntrepreneurUserIds:
        dto.hiddenEntrepreneurUserIds ??
        existing.hiddenEntrepreneurs.map((access) => access.entrepreneurUserId),
    };
    await this.validateToolPayload(merged, dto);

    if (dto.fileAssetId) {
      await this.files.markReadyForUser(
        user,
        dto.fileAssetId,
        (dto.type ?? existing.type) === EntrepreneurToolType.excel
          ? FileAssetUsage.tool_excel
          : FileAssetUsage.tool_pdf,
      );
    }
    await this.audit.capture(
      {
        action: "tools.updated",
        entityType: "tool",
        entityId: ({ id }) => id,
        summary: ({ name }) => `Updated tool ${name ?? ""}`.trim(),
        payload: {
          previousStatus: existing.status,
          nextStatus: dto.status ?? existing.status,
          previousVisibility: existing.visibility,
          nextVisibility: dto.visibility ?? existing.visibility,
        },
      },
      async (tx) => {
        const tool = await tx.tool.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.description !== undefined
              ? { description: dto.description.trim() }
              : {}),
            ...(dto.type !== undefined ? { type: dto.type } : {}),
            ...(dto.toolAreaId !== undefined
              ? { toolAreaId: dto.toolAreaId }
              : {}),
            ...(dto.iconKey !== undefined
              ? { iconKey: dto.iconKey.trim() }
              : {}),
            ...(dto.visibility !== undefined
              ? { visibility: dto.visibility }
              : {}),
            ...(dto.fileAssetId !== undefined
              ? { fileAssetId: dto.fileAssetId || null }
              : {}),
            ...(dto.embeddedUrl !== undefined
              ? { embeddedUrl: dto.embeddedUrl?.trim() || null }
              : {}),
            ...(dto.status !== undefined
              ? this.statusPatch(existing.status, dto.status)
              : {}),
            updatedById: user.id,
          },
        });

        if (
          dto.visibility !== undefined ||
          dto.programmeIds !== undefined ||
          dto.entrepreneurUserIds !== undefined ||
          dto.hiddenEntrepreneurUserIds !== undefined
        ) {
          await this.replaceAudience(tx, id, user.id, merged);
        }
        return tool;
      },
    );

    return this.getTool(user, id);
  }

  private buildToolWhere(
    user: User,
    query: ToolQueryDto,
  ): Prisma.ToolWhereInput {
    const filters: Prisma.ToolWhereInput[] = [];
    const scope = this.readScopeWhere(user);
    if (Object.keys(scope).length > 0) filters.push(scope);

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { toolArea: { name: { contains: search, mode: "insensitive" } } },
          { toolArea: { key: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    if (query.type) filters.push({ type: query.type });
    if (query.visibility) filters.push({ visibility: query.visibility });
    if (query.toolAreaId) filters.push({ toolAreaId: query.toolAreaId });
    if (query.excludeModuleId && user.role === UserRole.admin) {
      filters.push({
        contentLinks: {
          none: {
            contentItem: {
              modules: { some: { moduleId: query.excludeModuleId } },
            },
          },
        },
      });
    }
    if (query.status) filters.push({ status: query.status });

    return filters.length ? { AND: filters } : {};
  }

  private readScopeWhere(user: User): Prisma.ToolWhereInput {
    if (user.role === UserRole.admin) return {};

    const published = {
      status: EntrepreneurToolStatus.published,
      archivedAt: null,
      hiddenEntrepreneurs: { none: { entrepreneurUserId: user.id } },
    } satisfies Prisma.ToolWhereInput;

    if (user.role === UserRole.entrepreneur) {
      return {
        ...published,
        OR: [
          { visibility: EntrepreneurToolVisibility.all_entrepreneurs },
          {
            programmeAccess: {
              some: {
                programme: {
                  OR: [
                    { accessType: "free" },
                    {
                      accessGrants: {
                        some: { entrepreneurUserId: user.id, revokedAt: null },
                      },
                    },
                  ],
                },
              },
            },
          },
          { entrepreneurAccess: { some: { entrepreneurUserId: user.id } } },
        ],
      };
    }

    return published;
  }

  private async ensureManageableTool(id: string) {
    const tool = await this.prisma.tool.findFirst({
      where: {
        id,
        status: EntrepreneurToolStatus.published,
        archivedAt: null,
      },
      select: { id: true, name: true },
    });
    if (!tool) throw new NotFoundException("Published tool was not found.");
    return tool;
  }

  private async captureAccessChange(
    action: string,
    summary: string,
    toolId: string,
    entrepreneurUserId: string,
    mutation: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ) {
    await this.audit.capture(
      {
        action,
        entityType: "entrepreneurToolAccess",
        entityId: ({ id }) => id,
        summary,
        payload: { toolId, entrepreneurUserId },
      },
      async (tx) => {
        await mutation(tx);
        return { id: `${toolId}:${entrepreneurUserId}` };
      },
    );
  }

  private async validateToolPayload(
    effective: Partial<UpsertToolDto>,
    changed: Partial<UpsertToolDto> = effective,
  ) {
    if (changed.toolAreaId) {
      const toolArea = await this.prisma.toolArea.findFirst({
        where: { id: changed.toolAreaId, active: true },
      });
      if (!toolArea)
        throw new BadRequestException("Select a valid active tool area.");
    }

    if (
      effective.type === EntrepreneurToolType.embedded_tool &&
      effective.status === EntrepreneurToolStatus.published &&
      !effective.embeddedUrl
    ) {
      throw new BadRequestException(
        "Online tools need a link before publishing.",
      );
    }

    if (
      (effective.type === EntrepreneurToolType.pdf ||
        effective.type === EntrepreneurToolType.excel) &&
      effective.status === EntrepreneurToolStatus.published &&
      !effective.fileAssetId
    ) {
      throw new BadRequestException(
        effective.type === EntrepreneurToolType.excel
          ? "Excel tools need an uploaded workbook before publishing."
          : "PDF tools need an uploaded file before publishing.",
      );
    }

    if (
      effective.status === EntrepreneurToolStatus.published &&
      effective.visibility === EntrepreneurToolVisibility.programmes &&
      (effective.programmeIds ?? []).length === 0
    ) {
      throw new BadRequestException(
        "Select at least one programme before publishing this programme-visible tool.",
      );
    }

    if (
      effective.status === EntrepreneurToolStatus.published &&
      effective.visibility === EntrepreneurToolVisibility.entrepreneurs &&
      (effective.entrepreneurUserIds ?? []).length === 0
    ) {
      throw new BadRequestException(
        "Select at least one entrepreneur before publishing this individually visible tool.",
      );
    }

    await this.ensureProgrammesExist(changed.programmeIds ?? []);
    await this.ensureEntrepreneursExist([
      ...(changed.entrepreneurUserIds ?? []),
      ...(changed.hiddenEntrepreneurUserIds ?? []),
    ]);
  }

  private async ensureProgrammesExist(programmeIds: string[]) {
    const ids = Array.from(new Set(programmeIds));
    if (ids.length === 0) return;
    const count = await this.prisma.programme.count({
      where: { id: { in: ids } },
    });
    if (count !== ids.length)
      throw new BadRequestException(
        "One or more selected programmes are invalid.",
      );
  }

  private async ensureEntrepreneursExist(userIds: string[]) {
    const ids = Array.from(new Set(userIds));
    if (ids.length === 0) return;
    const count = await this.prisma.user.count({
      where: { id: { in: ids }, role: UserRole.entrepreneur },
    });
    if (count !== ids.length)
      throw new BadRequestException(
        "One or more selected entrepreneurs are invalid.",
      );
  }

  private async replaceAudience(
    tx: Prisma.TransactionClient,
    toolId: string,
    actorId: string,
    dto: Partial<UpsertToolDto>,
  ) {
    const programmeIds = Array.from(
      new Set(
        dto.visibility === EntrepreneurToolVisibility.programmes
          ? (dto.programmeIds ?? [])
          : [],
      ),
    );
    const entrepreneurIds = Array.from(
      new Set(
        dto.visibility === EntrepreneurToolVisibility.entrepreneurs
          ? (dto.entrepreneurUserIds ?? [])
          : [],
      ),
    );
    const hiddenIds = Array.from(new Set(dto.hiddenEntrepreneurUserIds ?? []));

    await tx.toolProgrammeAccess.deleteMany({ where: { toolId } });
    if (programmeIds.length > 0) {
      await tx.toolProgrammeAccess.createMany({
        data: programmeIds.map((programmeId) => ({ toolId, programmeId })),
        skipDuplicates: true,
      });
    }

    await tx.toolEntrepreneurAccess.deleteMany({ where: { toolId } });
    if (entrepreneurIds.length > 0) {
      await tx.toolEntrepreneurAccess.createMany({
        data: entrepreneurIds.map((entrepreneurUserId) => ({
          toolId,
          entrepreneurUserId,
          grantedById: actorId,
        })),
        skipDuplicates: true,
      });
    }

    await tx.toolHiddenEntrepreneur.deleteMany({ where: { toolId } });
    if (hiddenIds.length > 0) {
      await tx.toolHiddenEntrepreneur.createMany({
        data: hiddenIds.map((entrepreneurUserId) => ({
          toolId,
          entrepreneurUserId,
          hiddenById: actorId,
        })),
        skipDuplicates: true,
      });
    }
  }

  private statusPatch(
    previous: EntrepreneurToolStatus,
    next: EntrepreneurToolStatus,
  ) {
    return {
      status: next,
      ...(next === EntrepreneurToolStatus.published &&
      previous !== EntrepreneurToolStatus.published
        ? { publishedAt: new Date(), archivedAt: null }
        : {}),
      ...(next === EntrepreneurToolStatus.archived &&
      previous !== EntrepreneurToolStatus.archived
        ? { archivedAt: new Date() }
        : {}),
      ...(next === EntrepreneurToolStatus.draft ? { archivedAt: null } : {}),
    } satisfies Prisma.ToolUpdateInput;
  }

  private mapTool(tool: ToolWithInclude, includeManagement: boolean) {
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      toolArea: tool.toolArea,
      iconKey: tool.iconKey,
      visibility: tool.visibility,
      status: tool.status,
      embeddedUrl: tool.embeddedUrl,
      fileAsset: tool.fileAsset
        ? {
            id: tool.fileAsset.id,
            originalFilename: tool.fileAsset.originalFilename,
            mimeType: tool.fileAsset.mimeType,
            sizeBytes: tool.fileAsset.sizeBytes.toString(),
            status: tool.fileAsset.status,
            storageKey: tool.fileAsset.storageKey,
            downloadUrl:
              tool.fileAsset.status === "ready"
                ? this.storage.presign({
                    method: "GET",
                    storageKey: tool.fileAsset.storageKey,
                    expiresInSeconds: 5 * 60,
                  }).url
                : null,
          }
        : null,
      audience: includeManagement
        ? {
            programmeIds: tool.programmeAccess.map(
              (access) => access.programmeId,
            ),
            entrepreneurUserIds: tool.entrepreneurAccess.map(
              (access) => access.entrepreneurUserId,
            ),
            hiddenEntrepreneurUserIds: tool.hiddenEntrepreneurs.map(
              (access) => access.entrepreneurUserId,
            ),
            programmes: tool.programmeAccess.map((access) => ({
              id: access.programmeId,
              name: access.programme.name,
            })),
            entrepreneurs: tool.entrepreneurAccess.map((access) => ({
              id: access.entrepreneurUserId,
              name: this.audienceName(access.entrepreneur),
            })),
            hiddenEntrepreneurs: tool.hiddenEntrepreneurs.map((access) => ({
              id: access.entrepreneurUserId,
              name: this.audienceName(access.entrepreneur),
            })),
          }
        : {
            programmeIds: [],
            entrepreneurUserIds: [],
            hiddenEntrepreneurUserIds: [],
            programmes: [],
            entrepreneurs: [],
            hiddenEntrepreneurs: [],
          },
      createdBy: includeManagement ? this.mapUser(tool.createdBy) : null,
      updatedBy:
        includeManagement && tool.updatedBy
          ? this.mapUser(tool.updatedBy)
          : null,
      publishedAt: tool.publishedAt?.toISOString() ?? null,
      archivedAt: tool.archivedAt?.toISOString() ?? null,
      createdAt: tool.createdAt.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
    };
  }

  private audienceName(user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    businessMemberships: Array<{ business: { name: string } }>;
  }) {
    return (
      (user.businessMemberships[0]?.business.name ??
        [user.firstName, user.lastName].filter(Boolean).join(" ")) ||
      user.email
    );
  }

  private mapUser(user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  }) {
    return {
      id: user.id,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
      email: user.email,
    };
  }
}
