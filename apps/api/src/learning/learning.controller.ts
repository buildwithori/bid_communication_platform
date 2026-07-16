import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { LearnerProgressQueryDto } from './dto/learner-progress-query.dto';
import { SyncLearnerProgressDto } from './dto/sync-learner-progress.dto';
import { LearningService } from './learning.service';

@ApiTags('learning')
@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('progress')
  getProgress(@CurrentUser() user: User, @Query() query: LearnerProgressQueryDto) {
    return this.learningService.getProgress(user, query);
  }

  @Post('progress/sync')
  @Roles(UserRole.entrepreneur)
  syncProgress(@CurrentUser() user: User, @Body() input: SyncLearnerProgressDto) {
    return this.learningService.syncProgress(user, input);
  }
}
