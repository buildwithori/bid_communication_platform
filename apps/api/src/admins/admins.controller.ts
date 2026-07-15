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
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import {
  AcceptAdminInvitationDto,
  InviteAdminDto,
  UpdateAdminProfileDto,
  UpdateAdminStatusDto,
} from "./dto/admin-actions.dto";
import { AdminQueryDto } from "./dto/admin-query.dto";
import { AdminsService } from "./admins.service";

@ApiTags("admins")
@Roles(UserRole.admin)
@Controller("admins")
export class AdminsController {
  constructor(private readonly admins: AdminsService) {}

  @Get()
  list(@Query() query: AdminQueryDto) {
    return this.admins.list(query);
  }

  @Get("me/profile")
  myProfile(@CurrentUser() user: User) {
    return this.admins.myProfile(user.id);
  }

  @Patch("me/profile")
  updateMyProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateAdminProfileDto,
  ) {
    return this.admins.updateMyProfile(user.id, dto);
  }

  @Post("invitations")
  invite(@CurrentUser() user: User, @Body() dto: InviteAdminDto) {
    return this.admins.invite(user, dto);
  }

  @Post(":adminId/invitation/resend")
  resendInvitation(
    @CurrentUser() user: User,
    @Param("adminId") adminId: string,
  ) {
    return this.admins.resendInvitation(user, adminId);
  }

  @Patch(":adminId/status")
  updateStatus(
    @CurrentUser() user: User,
    @Param("adminId") adminId: string,
    @Body() dto: UpdateAdminStatusDto,
  ) {
    return this.admins.updateStatus(user, adminId, dto);
  }

  @Get(":adminId")
  get(@Param("adminId") adminId: string) {
    return this.admins.get(adminId);
  }
}

@ApiTags("admin-invitations")
@Controller("admin-invitations")
export class AdminInvitationsController {
  constructor(private readonly admins: AdminsService) {}

  @Public()
  @Post("accept")
  accept(@Body() dto: AcceptAdminInvitationDto) {
    return this.admins.acceptInvitation(dto);
  }
}
