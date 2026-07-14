import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { LookupQueryDto } from '../common/dto/lookup-query.dto';
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
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company-settings')
  @Roles(UserRole.admin)
  getCompanySettings() {
    return this.settingsService.getCompanySettings();
  }

  @Patch('company-settings')
  @Roles(UserRole.admin)
  updateCompanySettings(@Body() dto: UpdateCompanySettingsDto) {
    return this.settingsService.updateCompanySettings(dto);
  }

  @Post('settings/sectors')
  @Roles(UserRole.admin)
  createSector(@Body() dto: CreateSectorDto) {
    return this.settingsService.createSector(dto);
  }

  @Patch('settings/sectors/:id')
  @Roles(UserRole.admin)
  updateSector(@Param('id') id: string, @Body() dto: UpdateSectorDto) {
    return this.settingsService.updateSector(id, dto);
  }

  @Post('settings/business-stages')
  @Roles(UserRole.admin)
  createBusinessStage(@Body() dto: CreateBusinessStageDto) {
    return this.settingsService.createBusinessStage(dto);
  }

  @Patch('settings/business-stages/:id')
  @Roles(UserRole.admin)
  updateBusinessStage(@Param('id') id: string, @Body() dto: UpdateBusinessStageDto) {
    return this.settingsService.updateBusinessStage(id, dto);
  }

  @Post('settings/programme-goal-types')
  @Roles(UserRole.admin)
  createProgrammeGoalType(@Body() dto: CreateProgrammeGoalTypeDto) {
    return this.settingsService.createProgrammeGoalType(dto);
  }

  @Patch('settings/programme-goal-types/:id')
  @Roles(UserRole.admin)
  updateProgrammeGoalType(@Param('id') id: string, @Body() dto: UpdateProgrammeGoalTypeDto) {
    return this.settingsService.updateProgrammeGoalType(id, dto);
  }

  @Post('settings/tool-areas')
  @Roles(UserRole.admin)
  createToolArea(@Body() dto: CreateToolAreaDto) {
    return this.settingsService.createToolArea(dto);
  }

  @Patch('settings/tool-areas/:id')
  @Roles(UserRole.admin)
  updateToolArea(@Param('id') id: string, @Body() dto: UpdateToolAreaDto) {
    return this.settingsService.updateToolArea(id, dto);
  }

  @Get('lookups/sectors')
  listSectors(@Query() query: LookupQueryDto) {
    return this.settingsService.listSectors(query);
  }

  @Get('lookups/business-stages')
  listBusinessStages(@Query() query: LookupQueryDto) {
    return this.settingsService.listBusinessStages(query);
  }

  @Get('lookups/programme-goal-types')
  listProgrammeGoalTypes(@Query() query: LookupQueryDto) {
    return this.settingsService.listProgrammeGoalTypes(query);
  }

  @Get('lookups/tool-areas')
  listToolAreas(@Query() query: LookupQueryDto) {
    return this.settingsService.listToolAreas(query);
  }
}
