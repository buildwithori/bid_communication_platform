import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AcceptTrainerInvitationDto,
  InviteTrainerDto,
  UpdateTrainerDto,
  UpdateTrainerProfileDto,
  UpdateTrainerStatusDto,
} from './dto/trainer-actions.dto';
import { TrainerQueryDto } from './dto/trainer-query.dto';
import { TrainerManagementService } from './trainer-management.service';
import { TrainersService } from './trainers.service';

@ApiTags('trainers')
@Controller('trainers')
export class TrainersController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly management: TrainerManagementService,
  ) {}

  @Get()
  listTrainers(@CurrentUser() user: User, @Query() query: TrainerQueryDto) {
    return this.trainersService.listTrainers(user, query);
  }

  @Get('me/profile')
  @Roles(UserRole.trainer)
  myProfile(@CurrentUser() user: User) {
    return this.management.myProfile(user);
  }

  @Patch('me/profile')
  @Roles(UserRole.trainer)
  updateMyProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateTrainerProfileDto,
  ) {
    return this.management.updateMyProfile(user, dto);
  }

  @Post('invitations')
  @Roles(UserRole.admin)
  invite(@CurrentUser() user: User, @Body() dto: InviteTrainerDto) {
    return this.management.invite(user, dto);
  }

  @Post(':trainerUserId/invitation/resend')
  @Roles(UserRole.admin)
  resendInvitation(
    @CurrentUser() user: User,
    @Param('trainerUserId') trainerUserId: string,
  ) {
    return this.management.resendInvitation(user, trainerUserId);
  }

  @Patch(':trainerUserId/status')
  @Roles(UserRole.admin)
  updateStatus(
    @CurrentUser() user: User,
    @Param('trainerUserId') trainerUserId: string,
    @Body() dto: UpdateTrainerStatusDto,
  ) {
    return this.management.updateStatus(user, trainerUserId, dto);
  }

  @Patch(':trainerUserId')
  @Roles(UserRole.admin)
  update(
    @CurrentUser() user: User,
    @Param('trainerUserId') trainerUserId: string,
    @Body() dto: UpdateTrainerDto,
  ) {
    return this.management.update(user, trainerUserId, dto);
  }

  @Get(':trainerUserId')
  getTrainer(
    @CurrentUser() user: User,
    @Param('trainerUserId') trainerUserId: string,
  ) {
    return this.trainersService.getTrainer(user, trainerUserId);
  }
}

@ApiTags('trainer-invitations')
@Controller('trainer-invitations')
export class TrainerInvitationsController {
  constructor(private readonly management: TrainerManagementService) {}

  @Public()
  @Post('accept')
  accept(@Body() dto: AcceptTrainerInvitationDto) {
    return this.management.acceptInvitation(dto);
  }
}
