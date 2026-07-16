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
import { Roles } from '../auth/decorators/roles.decorator';
import { ContentService } from './content.service';
import { CreateContentItemDto } from './dto/create-content-item.dto';
import {
  AttachContentItemDto,
  ContentItemQueryDto,
  MoveModuleContentItemDto,
  UpdateContentItemDto,
} from './dto/content-query.dto';
import { UpsertContentRatingDto } from './dto/upsert-content-rating.dto';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('items')
  @Roles(UserRole.admin)
  listContentItems(
    @CurrentUser() user: User,
    @Query() query: ContentItemQueryDto,
  ) {
    return this.contentService.listContentItems(user, query);
  }

  @Get('modules/:moduleId/items')
  @Roles(UserRole.admin, UserRole.trainer)
  listModuleContentItems(
    @CurrentUser() user: User,
    @Param('moduleId') moduleId: string,
    @Query() query: ContentItemQueryDto,
  ) {
    return this.contentService.listModuleContentItems(user, moduleId, query);
  }

  @Post('modules/:moduleId/items')
  @Roles(UserRole.admin)
  createModuleContentItem(
    @CurrentUser() user: User,
    @Param('moduleId') moduleId: string,
    @Body() input: CreateContentItemDto,
  ) {
    return this.contentService.createModuleContentItem(user, moduleId, input);
  }

  @Post('modules/:moduleId/items/attach')
  @Roles(UserRole.admin)
  attachModuleContentItem(
    @CurrentUser() user: User,
    @Param('moduleId') moduleId: string,
    @Body() input: AttachContentItemDto,
  ) {
    return this.contentService.attachModuleContentItem(user, moduleId, input);
  }

  @Post('modules/:moduleId/items/:contentItemId/move')
  @Roles(UserRole.admin)
  moveModuleContentItem(
    @CurrentUser() user: User,
    @Param('moduleId') moduleId: string,
    @Param('contentItemId') contentItemId: string,
    @Body() input: MoveModuleContentItemDto,
  ) {
    return this.contentService.moveModuleContentItem(
      user,
      moduleId,
      contentItemId,
      input,
    );
  }

  @Patch('items/:contentItemId')
  @Roles(UserRole.admin)
  updateContentItem(
    @CurrentUser() user: User,
    @Param('contentItemId') contentItemId: string,
    @Body() input: UpdateContentItemDto,
  ) {
    return this.contentService.updateContentItem(user, contentItemId, input);
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
