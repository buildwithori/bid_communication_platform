import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { ToolRequestQueryDto } from './dto/tool-request-query.dto';
import { CreateToolRequestDto, UpdateToolRequestDto } from './dto/upsert-tool-request.dto';
import { ToolRequestsService } from './tool-requests.service';

@ApiTags('tool-requests')
@Controller('tool-requests')
@UseGuards(SessionAuthGuard, RolesGuard)
export class ToolRequestsController {
  constructor(private readonly toolRequestsService: ToolRequestsService) {}

  @Get()
  listRequests(@CurrentUser() user: User, @Query() query: ToolRequestQueryDto) {
    return this.toolRequestsService.listRequests(user, query);
  }

  @Get(':id')
  getRequest(@CurrentUser() user: User, @Param('id') id: string) {
    return this.toolRequestsService.getRequest(user, id);
  }

  @Post()
  @Roles(UserRole.entrepreneur)
  createRequest(@CurrentUser() user: User, @Body() dto: CreateToolRequestDto) {
    return this.toolRequestsService.createRequest(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  updateRequest(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateToolRequestDto) {
    return this.toolRequestsService.updateRequest(user, id, dto);
  }
}
