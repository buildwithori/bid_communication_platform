import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TrainerQueryDto } from './dto/trainer-query.dto';
import { TrainersService } from './trainers.service';

@ApiTags('trainers')
@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get()
  listTrainers(@CurrentUser() user: User, @Query() query: TrainerQueryDto) {
    return this.trainersService.listTrainers(user, query);
  }

  @Get(':trainerUserId')
  getTrainer(@CurrentUser() user: User, @Param('trainerUserId') trainerUserId: string) {
    return this.trainersService.getTrainer(user, trainerUserId);
  }
}
