import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { FilesModule } from "../files/files.module";
import { JobsModule } from "../jobs/jobs.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ReportExportService } from "./report-export.service";
import { ReportingController } from "./reporting.controller";
import { ReportingService } from "./reporting.service";

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    FilesModule,
    JobsModule,
    NotificationsModule,
  ],
  controllers: [ReportingController],
  providers: [ReportingService, ReportExportService],
  exports: [ReportingService, ReportExportService],
})
export class ReportingModule {}
