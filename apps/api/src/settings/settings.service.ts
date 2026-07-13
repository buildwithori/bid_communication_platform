import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { LookupQueryDto } from '../common/dto/lookup-query.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import {
  CreateBusinessStageDto,
  CreateProgrammeGoalTypeDto,
  CreateSectorDto,
  CreateToolAreaDto,
  UpdateBusinessStageDto,
  UpdateProgrammeGoalTypeDto,
  UpdateSectorDto,
  UpdateToolAreaDto,
} from './dto/lookup-entry.dto';

const COMPANY_SETTINGS_KEY = 'default';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getCompanySettings() {
    return this.prisma.companySettings.upsert({
      where: { singletonKey: COMPANY_SETTINGS_KEY },
      update: {},
      create: { singletonKey: COMPANY_SETTINGS_KEY },
    });
  }

  updateCompanySettings(dto: UpdateCompanySettingsDto) {
    return this.prisma.companySettings.upsert({
      where: { singletonKey: COMPANY_SETTINGS_KEY },
      update: dto,
      create: {
        singletonKey: COMPANY_SETTINGS_KEY,
        ...dto,
      },
    });
  }

  async createSector(dto: CreateSectorDto) {
    const key = this.normalizeKey(dto.key ?? dto.name);
    await this.ensureUniqueKey('sector', key);

    return this.prisma.sector.create({
      data: {
        name: dto.name.trim(),
        key,
        active: dto.active ?? true,
      },
    });
  }

  async updateSector(id: string, dto: UpdateSectorDto) {
    await this.ensureSectorExists(id);
    const key = dto.key ? this.normalizeKey(dto.key) : undefined;
    if (key) {
      await this.ensureUniqueKey('sector', key, id);
    }

    return this.prisma.sector.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(key !== undefined ? { key } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async createBusinessStage(dto: CreateBusinessStageDto) {
    const key = this.normalizeKey(dto.key ?? dto.name);
    await this.ensureUniqueKey('businessStage', key);

    return this.prisma.businessStage.create({
      data: {
        name: dto.name.trim(),
        key,
        definition: dto.definition.trim(),
        active: dto.active ?? true,
      },
    });
  }

  async updateBusinessStage(id: string, dto: UpdateBusinessStageDto) {
    await this.ensureBusinessStageExists(id);
    const key = dto.key ? this.normalizeKey(dto.key) : undefined;
    if (key) {
      await this.ensureUniqueKey('businessStage', key, id);
    }

    return this.prisma.businessStage.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(key !== undefined ? { key } : {}),
        ...(dto.definition !== undefined ? { definition: dto.definition.trim() } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async createProgrammeGoalType(dto: CreateProgrammeGoalTypeDto) {
    const key = this.normalizeKey(dto.key ?? dto.name);
    await this.ensureUniqueKey('programmeGoalType', key);

    return this.prisma.programmeGoalType.create({
      data: {
        name: dto.name.trim(),
        key,
        description: dto.description?.trim() || null,
        requiresTargetAmount: dto.requiresTargetAmount ?? false,
        active: dto.active ?? true,
      },
    });
  }

  async updateProgrammeGoalType(id: string, dto: UpdateProgrammeGoalTypeDto) {
    await this.ensureProgrammeGoalTypeExists(id);
    const key = dto.key ? this.normalizeKey(dto.key) : undefined;
    if (key) {
      await this.ensureUniqueKey('programmeGoalType', key, id);
    }

    return this.prisma.programmeGoalType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(key !== undefined ? { key } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.requiresTargetAmount !== undefined ? { requiresTargetAmount: dto.requiresTargetAmount } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async createToolArea(dto: CreateToolAreaDto) {
    const key = this.normalizeKey(dto.key ?? dto.name);
    await this.ensureUniqueKey('toolArea', key);

    return this.prisma.toolArea.create({
      data: {
        name: dto.name.trim(),
        key,
        active: dto.active ?? true,
      },
    });
  }

  async updateToolArea(id: string, dto: UpdateToolAreaDto) {
    await this.ensureToolAreaExists(id);
    const key = dto.key ? this.normalizeKey(dto.key) : undefined;
    if (key) {
      await this.ensureUniqueKey('toolArea', key, id);
    }

    return this.prisma.toolArea.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(key !== undefined ? { key } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  listSectors(query: LookupQueryDto) {
    return this.prisma.sector.findMany({
      where: this.buildLookupWhere<Prisma.SectorWhereInput>(query),
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      take: 100,
    });
  }

  listBusinessStages(query: LookupQueryDto) {
    return this.prisma.businessStage.findMany({
      where: this.buildLookupWhere<Prisma.BusinessStageWhereInput>(query),
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      take: 100,
    });
  }

  listProgrammeGoalTypes(query: LookupQueryDto) {
    return this.prisma.programmeGoalType.findMany({
      where: this.buildLookupWhere<Prisma.ProgrammeGoalTypeWhereInput>(query),
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      take: 100,
    });
  }

  listToolAreas(query: LookupQueryDto) {
    return this.prisma.toolArea.findMany({
      where: this.buildLookupWhere<Prisma.ToolAreaWhereInput>(query),
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      take: 100,
    });
  }

  private normalizeKey(value: string) {
    const key = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!key) {
      throw new BadRequestException('A valid key is required.');
    }

    return key;
  }

  private async ensureUniqueKey(
    model: 'sector' | 'businessStage' | 'programmeGoalType' | 'toolArea',
    key: string,
    currentId?: string,
  ) {
    const existing = await this.findByKey(model, key);
    if (existing && existing.id !== currentId) {
      throw new BadRequestException('This key is already in use.');
    }
  }

  private findByKey(
    model: 'sector' | 'businessStage' | 'programmeGoalType' | 'toolArea',
    key: string,
  ) {
    if (model === 'sector') return this.prisma.sector.findUnique({ where: { key } });
    if (model === 'businessStage') return this.prisma.businessStage.findUnique({ where: { key } });
    if (model === 'programmeGoalType') return this.prisma.programmeGoalType.findUnique({ where: { key } });
    return this.prisma.toolArea.findUnique({ where: { key } });
  }

  private async ensureSectorExists(id: string) {
    const sector = await this.prisma.sector.findUnique({ where: { id } });
    if (!sector) throw new NotFoundException('Sector was not found.');
  }

  private async ensureBusinessStageExists(id: string) {
    const stage = await this.prisma.businessStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('Business stage was not found.');
  }

  private async ensureProgrammeGoalTypeExists(id: string) {
    const goalType = await this.prisma.programmeGoalType.findUnique({ where: { id } });
    if (!goalType) throw new NotFoundException('Programme goal type was not found.');
  }

  private async ensureToolAreaExists(id: string) {
    const toolArea = await this.prisma.toolArea.findUnique({ where: { id } });
    if (!toolArea) throw new NotFoundException('Tool area was not found.');
  }

  private buildLookupWhere<TLookupWhere>(query: LookupQueryDto): TLookupWhere {
    const where: {
      active?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: Prisma.QueryMode };
        key?: { contains: string; mode: Prisma.QueryMode };
      }>;
    } = {};

    if (typeof query.active === 'boolean') {
      where.active = query.active;
    }

    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } },
        { key: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } },
      ];
    }

    return where as TLookupWhere;
  }
}
