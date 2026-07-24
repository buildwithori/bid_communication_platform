import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { JobsModule } from "../jobs/jobs.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CalendarSyncQueueService } from "./calendar-sync-queue.service";
import { CalendarSyncService } from "./calendar-sync.service";
import { CalendarTokenService } from "./calendar-token.service";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { GoogleCalendarWebhookController } from "./google-calendar-webhook.controller";

@Module({
  imports: [DatabaseModule, AuditModule, JobsModule, NotificationsModule],
  controllers: [CalendarController, GoogleCalendarWebhookController],
  providers: [
    CalendarService,
    CalendarTokenService,
    CalendarSyncQueueService,
    CalendarSyncService,
  ],
  exports: [
    CalendarService,
    CalendarTokenService,
    CalendarSyncQueueService,
    CalendarSyncService,
  ],
})
export class CalendarModule {}
