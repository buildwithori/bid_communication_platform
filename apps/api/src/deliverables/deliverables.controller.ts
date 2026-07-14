import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { DeliverableInstanceQueryDto } from './dto/deliverable-instance-query.dto';
import { DeliverableReviewQueryDto } from './dto/deliverable-review-query.dto';
import { DeliverablesService } from './deliverables.service';
import { ReviewDeliverableDto } from './dto/review-deliverable.dto';
import { UpdateDeliverableDueDateDto } from './dto/update-deliverable-due-date.dto';

@ApiTags('deliverables')
@Controller()
@UseGuards(SessionAuthGuard, RolesGuard)
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  @Get('deliverable-instances')
  listInstances(@CurrentUser() user: User, @Query() query: DeliverableInstanceQueryDto) {
    return this.deliverablesService.listInstances(user, query);
  }

  @Get('deliverable-reviews')
  listReviewQueue(@CurrentUser() user: User, @Query() query: DeliverableReviewQueryDto) {
    return this.deliverablesService.listReviewQueue(user, query);
  }


  @Post('deliverable-submissions/:id/reviews')
  @Roles(UserRole.admin, UserRole.trainer)
  reviewSubmission(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReviewDeliverableDto,
  ) {
    return this.deliverablesService.reviewSubmission(user, id, dto);
  }

  @Patch('deliverable-instances/:id/due-date')
  @Roles(UserRole.admin, UserRole.trainer)
  updateDueDate(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateDeliverableDueDateDto,
  ) {
    return this.deliverablesService.updateDueDate(user, id, dto);
  }
}
