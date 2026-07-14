import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { ProgrammeQueryDto } from './dto/programme-query.dto';
import { ProgrammesService } from './programmes.service';
import { CreateProgrammeDeliverableRuleDto, UpsertProgrammeDeliverableRuleDto } from './dto/upsert-programme-deliverable-rule.dto';

@ApiTags('programmes')
@Controller('programmes')
@UseGuards(SessionAuthGuard, RolesGuard)
export class ProgrammesController {
  constructor(private readonly programmesService: ProgrammesService) {}

  @Get()
  listProgrammes(@CurrentUser() user: User, @Query() query: ProgrammeQueryDto) {
    return this.programmesService.listProgrammes(user, query);
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
