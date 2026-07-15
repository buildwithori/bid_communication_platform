import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { CalendarTokenService } from "./calendar-token.service";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarTokenService],
  exports: [CalendarService, CalendarTokenService],
})
export class CalendarModule {}
