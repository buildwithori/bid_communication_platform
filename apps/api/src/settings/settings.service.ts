import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { LookupQueryDto } from '../common/dto/lookup-query.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

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
