import { Controller, Headers, HttpCode, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { CalendarSyncService } from "./calendar-sync.service";

@ApiTags("webhooks")
@Controller("webhooks/google-calendar")
export class GoogleCalendarWebhookController {
  constructor(private readonly sync: CalendarSyncService) {}

  @Post()
  @Public()
  @HttpCode(204)
  async receive(
    @Headers("x-goog-channel-id") channelId?: string,
    @Headers("x-goog-channel-token") channelToken?: string,
    @Headers("x-goog-resource-id") resourceId?: string,
    @Headers("x-goog-resource-state") resourceState?: string,
    @Headers("x-goog-message-number") messageNumber?: string,
  ) {
    await this.sync.receiveNotification({
      channelId,
      channelToken,
      resourceId,
      resourceState,
      messageNumber,
    });
  }
}
