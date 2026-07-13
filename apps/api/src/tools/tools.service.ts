import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EntrepreneurToolStatus,
  EntrepreneurToolType,
  EntrepreneurToolVisibility,
  Prisma,
  User,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ToolQueryDto } from './dto/tool-query.dto';
import { CreateToolDto, UpsertToolDto } from './dto/upsert-tool.dto';

const DEFAULT_TAKE = 20;

const toolInclude = {
  toolArea: { select: { id: true, name: true, key: true } },
  pdfAsset: {
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      storageKey: true,
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  programmeAccess: { select: { programmeId: true } },
  entrepreneurAccess: { select: { entrepreneurUserId: true } },
  hiddenEntrepreneurs: { select: { entrepreneurUserId: true } },
} satisfies Prisma.ToolInclude;

type ToolWithInclude = Prisma.ToolGetPayload<{ include: typeof toolInclude }>;

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTools(user: User, query: ToolQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const rows = await this.prisma.tool.findMany({
      where: this.buildToolWhere(user, query),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: toolInclude,
    });

    const nextCursor = rows.length > take ? rows[take]?.id ?? null : null;
    return { items: rows.slice(0, take).map((tool) => this.mapTool(tool)), nextCursor };
  }

  async getTool(user: User, id: string) {
    const tool = await this.prisma.tool.findFirst({
      where: { id, ...this.readScopeWhere(user) },
      include: toolInclude,
    });

    if (!tool) throw new NotFoundException('Tool was not found.');
    return this.mapTool(tool);
  }

  async createTool(user: User, dto: CreateToolDto) {
    await this.validateToolPayload(dto);

    const created = await this.prisma.$transaction(async (tx) => {
      const tool = await tx.tool.create({
        data: {
          name: dto.name.trim(),
          description: dto.description.trim(),
          type: dto.type,
          toolAreaId: dto.toolAreaId,
          iconKey: dto.iconKey.trim(),
          visibility: dto.visibility,
          status: dto.status,
          pdfAssetId: dto.pdfAssetId || null,
          embeddedUrl: dto.embeddedUrl?.trim() || null,
          createdById: user.id,
          publishedAt: dto.status === EntrepreneurToolStatus.published ? new Date() : null,
          archivedAt: dto.status === EntrepreneurToolStatus.archived ? new Date() : null,
        },
      });

      await this.replaceAudience(tx, tool.id, user.id, dto);
      return tool.id;
    });

    return this.getTool(user, created);
  }

  async updateTool(user: User, id: string, dto: UpsertToolDto) {
    const existing = await this.prisma.tool.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tool was not found.');

    const merged = { ...existing, ...dto };
    await this.validateToolPayload(merged);

    await this.prisma.$transaction(async (tx) => {
      await tx.tool.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.toolAreaId !== undefined ? { toolAreaId: dto.toolAreaId } : {}),
          ...(dto.iconKey !== undefined ? { iconKey: dto.iconKey.trim() } : {}),
          ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
          ...(dto.pdfAssetId !== undefined ? { pdfAssetId: dto.pdfAssetId || null } : {}),
          ...(dto.embeddedUrl !== undefined ? { embeddedUrl: dto.embeddedUrl?.trim() || null } : {}),
          ...(dto.status !== undefined ? this.statusPatch(existing.status, dto.status) : {}),
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
    });

    return this.getTool(user, id);
  }

  private buildToolWhere(user: User, query: ToolQueryDto): Prisma.ToolWhereInput {
    const filters: Prisma.ToolWhereInput[] = [];
    const scope = this.readScopeWhere(user);
    if (Object.keys(scope).length > 0) filters.push(scope);

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { toolArea: { name: { contains: search, mode: 'insensitive' } } },
          { toolArea: { key: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (query.type) filters.push({ type: query.type });
    if (query.visibility) filters.push({ visibility: query.visibility });
    if (query.toolAreaId) filters.push({ toolAreaId: query.toolAreaId });
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
            visibility: EntrepreneurToolVisibility.programmes,
            programmeAccess: {
              some: {
                programme: {
                  OR: [
                    { accessType: 'free' },
                    { accessGrants: { some: { entrepreneurUserId: user.id, revokedAt: null } } },
                  ],
                },
              },
            },
          },
          {
            visibility: EntrepreneurToolVisibility.entrepreneurs,
            entrepreneurAccess: { some: { entrepreneurUserId: user.id } },
          },
        ],
      };
    }

    return published;
  }

  private async validateToolPayload(dto: Partial<UpsertToolDto>) {
    if (dto.toolAreaId) {
      const toolArea = await this.prisma.toolArea.findFirst({ where: { id: dto.toolAreaId, active: true } });
      if (!toolArea) throw new BadRequestException('Select a valid active tool area.');
    }

    if (dto.type === EntrepreneurToolType.embedded_tool && dto.status === EntrepreneurToolStatus.published && !dto.embeddedUrl) {
      throw new BadRequestException('Online tools need a link before publishing.');
    }

    if (dto.type === EntrepreneurToolType.pdf && dto.status === EntrepreneurToolStatus.published && !dto.pdfAssetId) {
      throw new BadRequestException('PDF tools need an uploaded file before publishing.');
    }

    if (dto.visibility === EntrepreneurToolVisibility.programmes && (dto.programmeIds ?? []).length === 0) {
      throw new BadRequestException('Select at least one programme for programme visibility.');
    }

    if (dto.visibility === EntrepreneurToolVisibility.entrepreneurs && (dto.entrepreneurUserIds ?? []).length === 0) {
      throw new BadRequestException('Select at least one entrepreneur for individual visibility.');
    }

    await this.ensureProgrammesExist(dto.programmeIds ?? []);
    await this.ensureEntrepreneursExist([...(dto.entrepreneurUserIds ?? []), ...(dto.hiddenEntrepreneurUserIds ?? [])]);
  }

  private async ensureProgrammesExist(programmeIds: string[]) {
    const ids = Array.from(new Set(programmeIds));
    if (ids.length === 0) return;
    const count = await this.prisma.programme.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new BadRequestException('One or more selected programmes are invalid.');
  }

  private async ensureEntrepreneursExist(userIds: string[]) {
    const ids = Array.from(new Set(userIds));
    if (ids.length === 0) return;
    const count = await this.prisma.user.count({ where: { id: { in: ids }, role: UserRole.entrepreneur } });
    if (count !== ids.length) throw new BadRequestException('One or more selected entrepreneurs are invalid.');
  }

  private async replaceAudience(
    tx: Prisma.TransactionClient,
    toolId: string,
    actorId: string,
    dto: Partial<UpsertToolDto>,
  ) {
    const programmeIds = Array.from(new Set(dto.visibility === EntrepreneurToolVisibility.programmes ? dto.programmeIds ?? [] : []));
    const entrepreneurIds = Array.from(new Set(dto.visibility === EntrepreneurToolVisibility.entrepreneurs ? dto.entrepreneurUserIds ?? [] : []));
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
        data: entrepreneurIds.map((entrepreneurUserId) => ({ toolId, entrepreneurUserId, grantedById: actorId })),
        skipDuplicates: true,
      });
    }

    await tx.toolHiddenEntrepreneur.deleteMany({ where: { toolId } });
    if (hiddenIds.length > 0) {
      await tx.toolHiddenEntrepreneur.createMany({
        data: hiddenIds.map((entrepreneurUserId) => ({ toolId, entrepreneurUserId, hiddenById: actorId })),
        skipDuplicates: true,
      });
    }
  }

  private statusPatch(previous: EntrepreneurToolStatus, next: EntrepreneurToolStatus) {
    return {
      status: next,
      ...(next === EntrepreneurToolStatus.published && previous !== EntrepreneurToolStatus.published ? { publishedAt: new Date(), archivedAt: null } : {}),
      ...(next === EntrepreneurToolStatus.archived && previous !== EntrepreneurToolStatus.archived ? { archivedAt: new Date() } : {}),
      ...(next === EntrepreneurToolStatus.draft ? { archivedAt: null } : {}),
    } satisfies Prisma.ToolUpdateInput;
  }

  private mapTool(tool: ToolWithInclude) {
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
      pdfAsset: tool.pdfAsset
        ? {
            id: tool.pdfAsset.id,
            originalFilename: tool.pdfAsset.originalFilename,
            mimeType: tool.pdfAsset.mimeType,
            sizeBytes: tool.pdfAsset.sizeBytes.toString(),
            status: tool.pdfAsset.status,
            storageKey: tool.pdfAsset.storageKey,
          }
        : null,
      audience: {
        programmeIds: tool.programmeAccess.map((access) => access.programmeId),
        entrepreneurUserIds: tool.entrepreneurAccess.map((access) => access.entrepreneurUserId),
        hiddenEntrepreneurUserIds: tool.hiddenEntrepreneurs.map((access) => access.entrepreneurUserId),
      },
      createdBy: this.mapUser(tool.createdBy),
      updatedBy: tool.updatedBy ? this.mapUser(tool.updatedBy) : null,
      publishedAt: tool.publishedAt?.toISOString() ?? null,
      archivedAt: tool.archivedAt?.toISOString() ?? null,
      createdAt: tool.createdAt.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
    };
  }

  private mapUser(user: { id: string; firstName: string | null; lastName: string | null; email: string }) {
    return {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      email: user.email,
    };
  }
}
