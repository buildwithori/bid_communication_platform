import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProgrammeQueryDto } from './dto/programme-query.dto';
import { ProgrammesService } from './programmes.service';
import { CreateProgrammeDeliverableRuleDto, UpsertProgrammeDeliverableRuleDto } from './dto/upsert-programme-deliverable-rule.dto';
import { ArchiveProgrammeDto, CreateProgrammeDto, UpdateProgrammeDto } from './dto/programme-actions.dto';

@ApiTags('programmes')
@Controller('programmes')
export class ProgrammesController {
  constructor(private readonly programmesService: ProgrammesService) {}

  @Get()
  listProgrammes(@CurrentUser() user: User, @Query() query: ProgrammeQueryDto) {
    return this.programmesService.listProgrammes(user, query);
  }

  @Get('summary')
  @Roles(UserRole.admin)
  getProgrammeSummary(@CurrentUser() user: User) {
    return this.programmesService.getProgrammeSummary(user);
  }
  @Post()
  @Roles(UserRole.admin)
  createProgramme(
    @CurrentUser() user: User,
    @Body() dto: CreateProgrammeDto,
  ) {
    return this.programmesService.createProgramme(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  updateProgramme(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateProgrammeDto,
  ) {
    return this.programmesService.updateProgramme(user, id, dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.admin)
  publishProgramme(@CurrentUser() user: User, @Param('id') id: string) {
    return this.programmesService.publishProgramme(user, id);
  }

  @Post(':id/archive')
  @Roles(UserRole.admin)
  archiveProgramme(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ArchiveProgrammeDto,
  ) {
    return this.programmesService.archiveProgramme(user, id, dto);
  }

  @Post(':id/restore')
  @Roles(UserRole.admin)
  restoreProgramme(@CurrentUser() user: User, @Param('id') id: string) {
    return this.programmesService.restoreProgramme(user, id);
  }



  @Get(':id/deliverable-rules')
  listDeliverableRules(@CurrentUser() user: User, @Param('id') id: string) {
    return this.programmesService.listDeliverableRules(user, id);
  }

  @Post(':id/deliverable-rules')
  @Roles(UserRole.admin)
  createDeliverableRule(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateProgrammeDeliverableRuleDto,
  ) {
    return this.programmesService.createDeliverableRule(user, id, dto);
  }

  @Patch(':id/deliverable-rules/:ruleId')
  @Roles(UserRole.admin)
  updateDeliverableRule(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpsertProgrammeDeliverableRuleDto,
  ) {
    return this.programmesService.updateDeliverableRule(user, id, ruleId, dto);
  }

  @Get(':id')
  getProgramme(@CurrentUser() user: User, @Param('id') id: string) {
    return this.programmesService.getProgramme(user, id);
  }
}
