import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { DeliverableInstanceQueryDto } from './dto/deliverable-instance-query.dto';
import { DeliverableReviewQueryDto } from './dto/deliverable-review-query.dto';
import { DeliverablesService } from './deliverables.service';

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
}
