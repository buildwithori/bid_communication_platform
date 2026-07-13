import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { ToolQueryDto } from './dto/tool-query.dto';
import { CreateToolDto, UpsertToolDto } from './dto/upsert-tool.dto';
import { ToolsService } from './tools.service';

@ApiTags('tools')
@Controller('tools')
@UseGuards(SessionAuthGuard, RolesGuard)
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  listTools(@CurrentUser() user: User, @Query() query: ToolQueryDto) {
    return this.toolsService.listTools(user, query);
  }

  @Get(':id')
  getTool(@CurrentUser() user: User, @Param('id') id: string) {
    return this.toolsService.getTool(user, id);
  }

  @Post()
  @Roles(UserRole.admin)
  createTool(@CurrentUser() user: User, @Body() dto: CreateToolDto) {
    return this.toolsService.createTool(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  updateTool(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpsertToolDto) {
    return this.toolsService.updateTool(user, id, dto);
  }
}
