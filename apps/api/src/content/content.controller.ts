import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContentService } from './content.service';
import { UpsertContentRatingDto } from './dto/upsert-content-rating.dto';
import { CreateContentItemDto } from './dto/create-content-item.dto';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}


  @Post('modules/:moduleId/items')
  @Roles(UserRole.admin)
  createModuleContentItem(
    @CurrentUser() user: User,
    @Param('moduleId') moduleId: string,
    @Body() input: CreateContentItemDto,
  ) {
    return this.contentService.createModuleContentItem(user, moduleId, input);
  }

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
