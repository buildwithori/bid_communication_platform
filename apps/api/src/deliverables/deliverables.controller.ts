import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DeliverableHistoryQueryDto } from './dto/deliverable-history-query.dto';
import { DeliverableInstanceQueryDto } from './dto/deliverable-instance-query.dto';
import { DeliverableReviewQueryDto } from './dto/deliverable-review-query.dto';
import { DeliverablesService } from './deliverables.service';
import { ReviewDeliverableDto } from './dto/review-deliverable.dto';
import { UpdateDeliverableDueDateDto } from './dto/update-deliverable-due-date.dto';
import { SubmitDeliverableDto } from './dto/submit-deliverable.dto';

@ApiTags('deliverables')
@Controller()
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


  @Get('deliverable-instances/:id/submissions')
  listSubmissions(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() query: DeliverableHistoryQueryDto,
  ) {
    return this.deliverablesService.listSubmissions(user, id, query);
  }

  @Get('deliverable-instances/:id/feedback')
  listFeedback(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() query: DeliverableHistoryQueryDto,
  ) {
    return this.deliverablesService.listFeedback(user, id, query);
  }

  @Post('deliverable-instances/:id/submissions')
  @Roles(UserRole.entrepreneur)
  submitDeliverable(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SubmitDeliverableDto,
  ) {
    return this.deliverablesService.submitDeliverable(user, id, dto);
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

  @Post('deliverable-reviews/:id/read')
  @Roles(UserRole.entrepreneur)
  markReviewRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.deliverablesService.markReviewRead(user, id);
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
