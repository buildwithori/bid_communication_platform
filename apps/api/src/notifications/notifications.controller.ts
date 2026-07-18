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
import { NotificationType, User } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { NotificationQueryDto } from "./dto/notification-query.dto";
import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("notifications")
  listNotifications(
    @CurrentUser() user: User,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.listNotifications(user, query);
  }

  @Get("notifications/summary")
  summary(@CurrentUser() user: User) {
    return this.notificationsService.getSummary(user);
  }

  @Post("notifications/:id/read")
  markRead(@CurrentUser() user: User, @Param("id") id: string) {
    return this.notificationsService.markRead(user, id);
  }

  @Post("notifications/read-all")
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user);
  }

  @Get("notification-preferences")
  listPreferences(@CurrentUser() user: User) {
    return this.notificationsService.listPreferences(user);
  }

  @Get("notification-preferences/groups")
  listPreferenceGroups(@CurrentUser() user: User) {
    return this.notificationsService.listPreferenceGroups(user);
  }

  @Patch("notification-preferences/groups/:group")
  updatePreferenceGroup(
    @CurrentUser() user: User,
    @Param("group") group: string,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreferenceGroup(user, group, dto);
  }

  @Patch("notification-preferences/:type")
  updatePreference(
    @CurrentUser() user: User,
    @Param("type") type: NotificationType,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreference(user, type, dto);
  }
}
