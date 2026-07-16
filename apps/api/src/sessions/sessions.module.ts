import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { CalendarModule } from "../calendar/calendar.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";
import { SessionAvailabilityService } from "./session-availability.service";

@Module({
  imports: [
    AuthModule,
    AuditModule,
    CalendarModule,
    DatabaseModule,
    NotificationsModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, SessionAvailabilityService],
})
export class SessionsModule {}
