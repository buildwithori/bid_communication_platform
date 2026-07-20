import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProgrammeQueryDto } from './dto/programme-query.dto';
import { ProgrammeDeliverableRuleQueryDto } from './dto/programme-deliverable-rule-query.dto';
import { ProgrammesService } from './programmes.service';
import { CreateProgrammeDeliverableRuleDto, UpsertProgrammeDeliverableRuleDto } from './dto/upsert-programme-deliverable-rule.dto';
import { ArchiveProgrammeDto, CreateProgrammeDto, UpdateProgrammeDto } from './dto/programme-actions.dto';
import { DeleteResourceDto } from '../resource-deletion/dto/delete-resource.dto';
import { ResourceDeletionService } from '../resource-deletion/resource-deletion.service';
import { CreateProgrammeModuleDto, MoveProgrammeModuleDto, ProgrammeModuleQueryDto, ReuseProgrammeModuleDto, UpdateProgrammeModuleDto } from './dto/programme-module.dto';

@ApiTags('programmes')
@Controller('programmes')
export class ProgrammesController {
  constructor(
    private readonly programmesService: ProgrammesService,
    private readonly resourceDeletion: ResourceDeletionService,
  ) {}

  @Get()
  listProgrammes(@CurrentUser() user: User, @Query() query: ProgrammeQueryDto) {
    return this.programmesService.listProgrammes(user, query);
  }

  @Get('summary')
  @Roles(UserRole.admin, UserRole.trainer)
  getProgrammeSummary(@CurrentUser() user: User) {
    return this.programmesService.getProgrammeSummary(user);
  }
  @Post()
  @Roles(UserRole.admin)
  createProgramme(@CurrentUser() user: User, @Body() dto: CreateProgrammeDto) {
    return this.programmesService.createProgramme(user, dto);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  deleteProgramme(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: DeleteResourceDto) {
    return this.resourceDeletion.deleteProgramme(user, id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  updateProgramme(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateProgrammeDto) {
    return this.programmesService.updateProgramme(user, id, dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.admin)
  publishProgramme(@CurrentUser() user: User, @Param('id') id: string) {
    return this.programmesService.publishProgramme(user, id);
  }

  @Post(':id/archive')
  @Roles(UserRole.admin)
  archiveProgramme(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: ArchiveProgrammeDto) {
    return this.programmesService.archiveProgramme(user, id, dto);
  }

  @Post(':id/restore')
  @Roles(UserRole.admin)
  restoreProgramme(@CurrentUser() user: User, @Param('id') id: string) {
    return this.programmesService.restoreProgramme(user, id);
  }

  @Get(':id/modules')
  listProgrammeModules(@CurrentUser() user: User, @Param('id') id: string, @Query() query: ProgrammeModuleQueryDto) {
    return this.programmesService.listProgrammeModules(user, id, query);
  }

  @Get(':id/player')
  getProgrammePlayer(@CurrentUser() user: User, @Param('id') id: string) {
    return this.programmesService.getProgrammePlayer(user, id);
  }

  @Get(':id/modules/:moduleId')
  getProgrammeModule(@CurrentUser() user: User, @Param('id') id: string, @Param('moduleId') moduleId: string) {
    return this.programmesService.getProgrammeModule(user, id, moduleId);
  }

  @Get(':id/reusable-modules')
  @Roles(UserRole.admin)
  listReusableModules(@CurrentUser() user: User, @Param('id') id: string, @Query() query: ProgrammeModuleQueryDto) {
    return this.programmesService.listReusableModules(user, id, query);
  }

  @Post(':id/modules')
  @Roles(UserRole.admin)
  createProgrammeModule(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateProgrammeModuleDto) {
    return this.programmesService.createProgrammeModule(user, id, dto);
  }

  @Post(':id/modules/reuse')
  @Roles(UserRole.admin)
  reuseProgrammeModule(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: ReuseProgrammeModuleDto) {
    return this.programmesService.reuseProgrammeModule(user, id, dto);
  }

  @Patch(':id/modules/:moduleId')
  @Roles(UserRole.admin)
  updateProgrammeModule(@CurrentUser() user: User, @Param('id') id: string, @Param('moduleId') moduleId: string, @Body() dto: UpdateProgrammeModuleDto) {
    return this.programmesService.updateProgrammeModule(user, id, moduleId, dto);
  }

  @Delete(':id/modules/:moduleId')
  @Roles(UserRole.admin)
  deleteProgrammeModule(@CurrentUser() user: User, @Param('id') id: string, @Param('moduleId') moduleId: string, @Body() dto: DeleteResourceDto) {
    return this.resourceDeletion.deleteProgrammeModule(user, id, moduleId, dto);
  }

  @Post(':id/modules/:moduleId/move')
  @Roles(UserRole.admin)
  moveProgrammeModule(@CurrentUser() user: User, @Param('id') id: string, @Param('moduleId') moduleId: string, @Body() dto: MoveProgrammeModuleDto) {
    return this.programmesService.moveProgrammeModule(user, id, moduleId, dto);
  }

  @Get(':id/deliverable-rules')
  listDeliverableRules(@CurrentUser() user: User, @Param('id') id: string, @Query() query: ProgrammeDeliverableRuleQueryDto) {
    return this.programmesService.listDeliverableRules(user, id, query);
  }

  @Post(':id/deliverable-rules')
  @Roles(UserRole.admin)
  createDeliverableRule(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateProgrammeDeliverableRuleDto) {
    return this.programmesService.createDeliverableRule(user, id, dto);
  }

  @Patch(':id/deliverable-rules/:ruleId')
  @Roles(UserRole.admin)
  updateDeliverableRule(@CurrentUser() user: User, @Param('id') id: string, @Param('ruleId') ruleId: string, @Body() dto: UpsertProgrammeDeliverableRuleDto) {
    return this.programmesService.updateDeliverableRule(user, id, ruleId, dto);
  }

  @Get(':id')
  getProgramme(@CurrentUser() user: User, @Param('id') id: string) {
    return this.programmesService.getProgramme(user, id);
  }
}
