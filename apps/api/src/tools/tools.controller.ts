import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User, UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { ToolQueryDto } from "./dto/tool-query.dto";
import { CreateToolDto, UpsertToolDto } from "./dto/upsert-tool.dto";
import { ToolsService } from "./tools.service";

@ApiTags("tools")
@Controller("tools")
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  @Roles(UserRole.admin, UserRole.entrepreneur)
  listTools(@CurrentUser() user: User, @Query() query: ToolQueryDto) {
    return this.toolsService.listTools(user, query);
  }

  @Get("summary")
  @Roles(UserRole.admin, UserRole.entrepreneur)
  summary(@CurrentUser() user: User) {
    return this.toolsService.summary(user);
  }

  @Get("entrepreneur/:entrepreneurUserId")
  @Roles(UserRole.admin)
  listEntrepreneurTools(
    @Param("entrepreneurUserId") entrepreneurUserId: string,
    @Query() query: ToolQueryDto,
  ) {
    return this.toolsService.listEntrepreneurTools(entrepreneurUserId, query);
  }

  @Post(":id/entrepreneur/:entrepreneurUserId/grant")
  @Roles(UserRole.admin)
  grantEntrepreneurAccess(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Param("entrepreneurUserId") entrepreneurUserId: string,
  ) {
    return this.toolsService.grantEntrepreneurAccess(
      user,
      id,
      entrepreneurUserId,
    );
  }

  @Post(":id/entrepreneur/:entrepreneurUserId/revoke")
  @Roles(UserRole.admin)
  revokeEntrepreneurAccess(
    @Param("id") id: string,
    @Param("entrepreneurUserId") entrepreneurUserId: string,
  ) {
    return this.toolsService.revokeEntrepreneurAccess(id, entrepreneurUserId);
  }

  @Post(":id/entrepreneur/:entrepreneurUserId/hide")
  @Roles(UserRole.admin)
  hideFromEntrepreneur(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Param("entrepreneurUserId") entrepreneurUserId: string,
  ) {
    return this.toolsService.hideFromEntrepreneur(user, id, entrepreneurUserId);
  }

  @Post(":id/entrepreneur/:entrepreneurUserId/restore")
  @Roles(UserRole.admin)
  restoreForEntrepreneur(
    @Param("id") id: string,
    @Param("entrepreneurUserId") entrepreneurUserId: string,
  ) {
    return this.toolsService.restoreForEntrepreneur(id, entrepreneurUserId);
  }

  @Get(":id")
  @Roles(UserRole.admin, UserRole.entrepreneur)
  getTool(@CurrentUser() user: User, @Param("id") id: string) {
    return this.toolsService.getTool(user, id);
  }

  @Post()
  @Roles(UserRole.admin)
  createTool(@CurrentUser() user: User, @Body() dto: CreateToolDto) {
    return this.toolsService.createTool(user, dto);
  }

  @Patch(":id")
  @Roles(UserRole.admin)
  updateTool(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpsertToolDto,
  ) {
    return this.toolsService.updateTool(user, id, dto);
  }
}
