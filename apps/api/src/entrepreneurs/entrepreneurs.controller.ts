import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AcceptEntrepreneurInvitationDto,
  EntrepreneurProfileDto,
  InviteEntrepreneurDto,
  ProgrammeAccessDto,
  UpdateEntrepreneurStatusDto,
} from './dto/entrepreneur-actions.dto';
import { EntrepreneurQueryDto } from './dto/entrepreneur-query.dto';
import { ProfileRecordQueryDto, ProgrammeAccessQueryDto } from './dto/profile-record-query.dto';
import {
  UpsertFundraisingRoundDto,
  UpsertPeriodicUpdateDto,
  UpsertProgrammeGoalDto,
} from './dto/profile-records.dto';
import { EntrepreneurManagementService } from './entrepreneur-management.service';
import { EntrepreneursService } from './entrepreneurs.service';

@ApiTags('entrepreneurs')
@Controller('entrepreneurs')
export class EntrepreneursController {
  constructor(
    private readonly entrepreneursService: EntrepreneursService,
    private readonly management: EntrepreneurManagementService,
  ) {}

  @Get()
  listEntrepreneurs(@CurrentUser() user: User, @Query() query: EntrepreneurQueryDto) {
    return this.entrepreneursService.listEntrepreneurs(user, query);
  }

  @Get('summary')
  @Roles(UserRole.admin, UserRole.trainer)
  summary(@CurrentUser() user: User) {
    return this.entrepreneursService.summary(user);
  }

  @Get('me/profile')
  @Roles(UserRole.entrepreneur)
  myProfile(@CurrentUser() user: User) {
    return this.management.myProfile(user);
  }

  @Patch('me/profile')
  @Roles(UserRole.entrepreneur)
  updateMyProfile(
    @CurrentUser() user: User,
    @Body() dto: EntrepreneurProfileDto,
  ) {
    return this.management.updateMyProfile(user, dto);
  }

  @Post('invitations')
  @Roles(UserRole.admin)
  invite(@CurrentUser() user: User, @Body() dto: InviteEntrepreneurDto) {
    return this.management.invite(user, dto);
  }

  @Post(':entrepreneurUserId/invitation/resend')
  @Roles(UserRole.admin)
  resendInvitation(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
  ) {
    return this.management.resendInvitation(user, entrepreneurUserId);
  }

  @Patch(':entrepreneurUserId/status')
  @Roles(UserRole.admin)
  updateStatus(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Body() dto: UpdateEntrepreneurStatusDto,
  ) {
    return this.management.updateStatus(user, entrepreneurUserId, dto);
  }

  @Patch(':entrepreneurUserId')
  @Roles(UserRole.admin)
  update(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Body() dto: EntrepreneurProfileDto,
  ) {
    return this.management.update(user, entrepreneurUserId, dto);
  }

  @Post(':entrepreneurUserId/programme-access')
  @Roles(UserRole.admin)
  grantProgramme(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Body() dto: ProgrammeAccessDto,
  ) {
    return this.management.grantProgramme(user, entrepreneurUserId, dto);
  }

  @Post(':entrepreneurUserId/programme-access/revoke')
  @Roles(UserRole.admin)
  revokeProgramme(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Body() dto: ProgrammeAccessDto,
  ) {
    return this.management.revokeProgramme(user, entrepreneurUserId, dto);
  }

  @Get(':entrepreneurUserId/programme-access')
  listProgrammeAccess(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Query() query: ProgrammeAccessQueryDto,
  ) {
    return this.entrepreneursService.listProgrammeAccess(user, entrepreneurUserId, query);
  }

  @Get(':entrepreneurUserId/programme-goals')
  listProgrammeGoals(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Query() query: ProfileRecordQueryDto,
  ) {
    return this.entrepreneursService.listProgrammeGoals(user, entrepreneurUserId, query);
  }

  @Get(':entrepreneurUserId/fundraising-rounds')
  listFundraisingRounds(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Query() query: ProfileRecordQueryDto,
  ) {
    return this.entrepreneursService.listFundraisingRounds(user, entrepreneurUserId, query);
  }

  @Get(':entrepreneurUserId/periodic-updates')
  listPeriodicUpdates(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
    @Query() query: ProfileRecordQueryDto,
  ) {
    return this.entrepreneursService.listPeriodicUpdates(user, entrepreneurUserId, query);
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
  getEntrepreneur(
    @CurrentUser() user: User,
    @Param('entrepreneurUserId') entrepreneurUserId: string,
  ) {
    return this.entrepreneursService.getEntrepreneur(user, entrepreneurUserId);
  }
}

@ApiTags('entrepreneur-invitations')
@Controller('entrepreneur-invitations')
export class EntrepreneurInvitationsController {
  constructor(private readonly management: EntrepreneurManagementService) {}

  @Public()
  @Post('accept')
  accept(@Body() dto: AcceptEntrepreneurInvitationDto) {
    return this.management.acceptInvitation(dto);
  }
}
