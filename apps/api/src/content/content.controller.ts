import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { ContentService } from './content.service';
import { UpsertContentRatingDto } from './dto/upsert-content-rating.dto';

@ApiTags('content')
@Controller('content')
@UseGuards(SessionAuthGuard, RolesGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('ratings/:contentItemId/me')
  @Roles(UserRole.entrepreneur)
  getMyRating(
    @CurrentUser() user: User,
    @Param('contentItemId') contentItemId: string,
  ) {
    return this.contentService.getMyRating(user, contentItemId);
  }

  @Post('ratings')
  @Roles(UserRole.entrepreneur)
  upsertRating(
    @CurrentUser() user: User,
    @Body() input: UpsertContentRatingDto,
  ) {
    return this.contentService.upsertRating(user, input);
  }
}
