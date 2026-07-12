import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LookupQueryDto } from '../common/dto/lookup-query.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company-settings')
  getCompanySettings() {
    return this.settingsService.getCompanySettings();
  }

  @Patch('company-settings')
  updateCompanySettings(@Body() dto: UpdateCompanySettingsDto) {
    return this.settingsService.updateCompanySettings(dto);
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
