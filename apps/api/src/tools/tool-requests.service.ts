import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ToolRequestStatus, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ToolRequestQueryDto } from './dto/tool-request-query.dto';
import { CreateToolRequestDto, UpdateToolRequestDto } from './dto/upsert-tool-request.dto';

const DEFAULT_TAKE = 20;


const toolRequestTransitions: Record<ToolRequestStatus, ToolRequestStatus[]> = {
  [ToolRequestStatus.under_review]: [
    ToolRequestStatus.in_development,
    ToolRequestStatus.built,
    ToolRequestStatus.declined,
  ],
  [ToolRequestStatus.in_development]: [
    ToolRequestStatus.under_review,
    ToolRequestStatus.built,
    ToolRequestStatus.declined,
  ],
  [ToolRequestStatus.built]: [ToolRequestStatus.under_review],
  [ToolRequestStatus.declined]: [ToolRequestStatus.under_review],
};

const toolRequestInclude = {
  toolArea: { select: { id: true, name: true, key: true } },
  linkedTool: { select: { id: true, name: true, status: true } },
  decidedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  entrepreneurUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      entrepreneurProgrammeGrants: {
        where: { revokedAt: null },
        select: { programme: { select: { id: true, name: true } } },
      },
      businessMemberships: {
        where: { isPrimary: true },
        select: {
          business: {
            select: {
              id: true,
              name: true,
              country: true,
            },
          },
        },
        take: 1,
      },
    },
  },
} satisfies Prisma.ToolRequestInclude;

type ToolRequestWithInclude = Prisma.ToolRequestGetPayload<{ include: typeof toolRequestInclude }>;

@Injectable()
export class ToolRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async listRequests(user: User, query: ToolRequestQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const rows = await this.prisma.toolRequest.findMany({
      where: this.buildWhere(user, query),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: toolRequestInclude,
    });

    const nextCursor = rows.length > take ? rows[take]?.id ?? null : null;
    return { items: rows.slice(0, take).map((request) => this.mapRequest(request)), nextCursor };
  }

  async getRequest(user: User, id: string) {
    const request = await this.prisma.toolRequest.findFirst({
      where: { id, ...this.readScopeWhere(user) },
      include: toolRequestInclude,
    });

    if (!request) throw new NotFoundException('Tool request was not found.');
    return this.mapRequest(request);
  }

  async createRequest(user: User, dto: CreateToolRequestDto) {
    if (user.role !== UserRole.entrepreneur) {
      throw new BadRequestException('Only entrepreneurs can request tools.');
    }

    await this.ensureToolArea(dto.toolAreaId);

    const created = await this.prisma.toolRequest.create({
      data: {
        entrepreneurUserId: user.id,
        title: dto.title.trim(),
        businessNeed: dto.businessNeed.trim(),
        toolAreaId: dto.toolAreaId,
        neededBy: dto.neededBy ? new Date(dto.neededBy) : null,
      },
      include: toolRequestInclude,
    });

    return this.mapRequest(created);
  }

  async updateRequest(user: User, id: string, dto: UpdateToolRequestDto) {
    const existing = await this.prisma.toolRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tool request was not found.');

    if (dto.linkedToolId) {
      const tool = await this.prisma.tool.findUnique({ where: { id: dto.linkedToolId } });
      if (!tool) throw new BadRequestException('Linked tool was not found.');
    }

    const nextStatus = dto.status ?? existing.status;
    const nextLinkedToolId = dto.linkedToolId !== undefined ? dto.linkedToolId || null : existing.linkedToolId;
    const nextDecisionNote = dto.adminDecisionNote !== undefined ? dto.adminDecisionNote?.trim() || null : existing.adminDecisionNote;
    const isDecision = dto.status !== undefined && dto.status !== existing.status;
    const reopening = nextStatus === ToolRequestStatus.under_review;

    if (isDecision) {
      this.ensureAllowedTransition(existing.status, nextStatus);
    }
    if (nextStatus === ToolRequestStatus.built && !nextLinkedToolId) {
      throw new BadRequestException('Link the built tool before marking this request as built.');
    }
    if (nextStatus === ToolRequestStatus.declined && !nextDecisionNote) {
      throw new BadRequestException('Add a decision note before declining a tool request.');
    }

    const updated = await this.prisma.toolRequest.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.adminDecisionNote !== undefined ? { adminDecisionNote: nextDecisionNote } : {}),
        ...(dto.linkedToolId !== undefined ? { linkedToolId: nextLinkedToolId } : {}),
        ...(isDecision && !reopening ? { decidedById: user.id, decidedAt: new Date() } : {}),
        ...(reopening ? { decidedById: null, decidedAt: null } : {}),
      },
      include: toolRequestInclude,
    });

    return this.mapRequest(updated);
  }


  private ensureAllowedTransition(current: ToolRequestStatus, next: ToolRequestStatus) {
    if (current === next) return;
    if (toolRequestTransitions[current].includes(next)) return;
    throw new BadRequestException(`Cannot move a tool request from ${current} to ${next}.`);
  }

  private availableTransitions(status: ToolRequestStatus) {
    return toolRequestTransitions[status];
  }

  private buildWhere(user: User, query: ToolRequestQueryDto): Prisma.ToolRequestWhereInput {
    const filters: Prisma.ToolRequestWhereInput[] = [];
    const scope = this.readScopeWhere(user);
    if (Object.keys(scope).length > 0) filters.push(scope);

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { businessNeed: { contains: search, mode: 'insensitive' } },
          { toolArea: { name: { contains: search, mode: 'insensitive' } } },
          { entrepreneurUser: { email: { contains: search, mode: 'insensitive' } } },
          { entrepreneurUser: { businessMemberships: { some: { business: { name: { contains: search, mode: 'insensitive' } } } } } },
        ],
      });
    }

    if (query.status) filters.push({ status: query.status });
    if (query.toolAreaId) filters.push({ toolAreaId: query.toolAreaId });

    return filters.length ? { AND: filters } : {};
  }

  private readScopeWhere(user: User): Prisma.ToolRequestWhereInput {
    if (user.role === UserRole.admin) return {};
    if (user.role === UserRole.entrepreneur) return { entrepreneurUserId: user.id };
    return { id: '__none__' };
  }

  private async ensureToolArea(toolAreaId: string) {
    const toolArea = await this.prisma.toolArea.findFirst({ where: { id: toolAreaId, active: true } });
    if (!toolArea) throw new BadRequestException('Select a valid tool area.');
  }

  private mapRequest(request: ToolRequestWithInclude) {
    const membership = request.entrepreneurUser.businessMemberships[0];
    const programmes = request.entrepreneurUser.entrepreneurProgrammeGrants.map((grant) => grant.programme);

    return {
      id: request.id,
      entrepreneurUserId: request.entrepreneurUserId,
      title: request.title,
      businessNeed: request.businessNeed,
      toolArea: request.toolArea,
      neededBy: request.neededBy?.toISOString() ?? null,
      status: request.status,
      availableTransitions: this.availableTransitions(request.status),
      adminDecisionNote: request.adminDecisionNote,
      decidedAt: request.decidedAt?.toISOString() ?? null,
      decidedBy: request.decidedBy ? this.mapUser(request.decidedBy) : null,
      linkedTool: request.linkedTool,
      entrepreneur: {
        userId: request.entrepreneurUser.id,
        name: this.userName(request.entrepreneurUser),
        email: request.entrepreneurUser.email,
        businessId: membership?.business.id ?? null,
        businessName: membership?.business.name ?? this.userName(request.entrepreneurUser),
        country: membership?.business.country ?? null,
        programmes,
      },
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  private mapUser(user: { id: string; firstName: string | null; lastName: string | null; email: string }) {
    return { id: user.id, name: this.userName(user), email: user.email };
  }

  private userName(user: { firstName: string | null; lastName: string | null; email: string }) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  }
}
