import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EntrepreneurQueryDto } from './dto/entrepreneur-query.dto';
import { ProfileRecordQueryDto } from './dto/profile-record-query.dto';
import { UpsertFundraisingRoundDto, UpsertPeriodicUpdateDto, UpsertProgrammeGoalDto } from './dto/profile-records.dto';
import { EntrepreneursService } from './entrepreneurs.service';

@ApiTags('entrepreneurs')
@Controller('entrepreneurs')
export class EntrepreneursController {
  constructor(private readonly entrepreneursService: EntrepreneursService) {}

  @Get()
  listEntrepreneurs(@CurrentUser() user: User, @Query() query: EntrepreneurQueryDto) {
    return this.entrepreneursService.listEntrepreneurs(user, query);
  }

  @Get(':entrepreneurUserId/programme-goals')
  listProgrammeGoals(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Query() query: ProfileRecordQueryDto,
  ) {
    return this.entrepreneursService.listProgrammeGoals(
      user,
      entrepreneurUserId,
      query,
    );
  }

  @Get(':entrepreneurUserId/fundraising-rounds')
  listFundraisingRounds(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Query() query: ProfileRecordQueryDto,
  ) {
    return this.entrepreneursService.listFundraisingRounds(
      user,
      entrepreneurUserId,
      query,
    );
  }

  @Get(':entrepreneurUserId/periodic-updates')
  listPeriodicUpdates(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Query() query: ProfileRecordQueryDto,
  ) {
    return this.entrepreneursService.listPeriodicUpdates(
      user,
      entrepreneurUserId,
      query,
    );
  }

  @Post(':entrepreneurUserId/programme-goals')
  createProgrammeGoal(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Body() dto: UpsertProgrammeGoalDto,
  ) {
    return this.entrepreneursService.createProgrammeGoal(user, entrepreneurUserId, dto);
  }

  @Patch(':entrepreneurUserId/programme-goals/:goalId')
  updateProgrammeGoal(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Param('goalId') goalId: string,
    @Body() dto: UpsertProgrammeGoalDto,
  ) {
    return this.entrepreneursService.updateProgrammeGoal(user, entrepreneurUserId, goalId, dto);
  }

  @Post(':entrepreneurUserId/fundraising-rounds')
  createFundraisingRound(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Body() dto: UpsertFundraisingRoundDto,
  ) {
    return this.entrepreneursService.createFundraisingRound(user, entrepreneurUserId, dto);
  }

  @Patch(':entrepreneurUserId/fundraising-rounds/:roundId')
  updateFundraisingRound(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Param('roundId') roundId: string,
    @Body() dto: UpsertFundraisingRoundDto,
  ) {
    return this.entrepreneursService.updateFundraisingRound(user, entrepreneurUserId, roundId, dto);
  }

  @Post(':entrepreneurUserId/periodic-updates')
  createPeriodicUpdate(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Body() dto: UpsertPeriodicUpdateDto,
  ) {
    return this.entrepreneursService.createPeriodicUpdate(user, entrepreneurUserId, dto);
  }

  @Patch(':entrepreneurUserId/periodic-updates/:updateId')
  updatePeriodicUpdate(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Param('updateId') updateId: string,
    @Body() dto: UpsertPeriodicUpdateDto,
  ) {
    return this.entrepreneursService.updatePeriodicUpdate(user, entrepreneurUserId, updateId, dto);
  }

  @Get(':entrepreneurUserId')
  getEntrepreneur(@CurrentUser() user: User, @Param('entrepreneurUserId') entrepreneurUserId: string) {
    return this.entrepreneursService.getEntrepreneur(user, entrepreneurUserId);
  }
}
