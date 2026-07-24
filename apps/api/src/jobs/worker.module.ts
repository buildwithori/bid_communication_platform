import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "../audit/audit.module";
import { RequestContextModule } from "../common/request-context/request-context.module";
import { validateEnv } from "../config/env.validation";
import { CalendarModule } from '../calendar/calendar.module';
import { DatabaseModule } from "../database/database.module";
import { DeliverableLifecycleModule } from "../deliverables/deliverable-lifecycle.module";
import { EmailModule } from "../email/email.module";
import { FilesModule } from '../files/files.module';
import { VideoModule } from '../video/video.module';
import { NotificationAutomationService } from "../notifications/notification-automation.service";
import { NotificationDeliveryService } from "../notifications/notification-delivery.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { ReportingModule } from "../reporting/reporting.module";
import { ResourceDeletionModule } from "../resource-deletion/resource-deletion.module";
import { ExternalResourceCleanupService } from './external-resource-cleanup.service';
import { JobsModule } from "./jobs.module";
import { AuditProcessor } from "./processors/audit.processor";
import { ExternalResourceCleanupProcessor } from './processors/external-resource-cleanup.processor';
import { NotificationDeliveryProcessor } from "./processors/notification-delivery.processor";
import { NotificationAutomationProcessor } from "./processors/notification-automation.processor";
import { RecurringDeliverablesProcessor } from "./processors/recurring-deliverables.processor";
import { ReportExportProcessor } from "./processors/report-export.processor";
import { TransactionalEmailProcessor } from "./processors/transactional-email.processor";
import { VideoReconciliationProcessor } from "./processors/video-reconciliation.processor";
import { CalendarSyncProcessor } from "./processors/calendar-sync.processor";
import { WorkerHeartbeatService } from "./worker-heartbeat.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    RequestContextModule,
    EmailModule,
    FilesModule,
    VideoModule,
    CalendarModule,
    JobsModule,
    AuditModule,
    DeliverableLifecycleModule,
    ReportingModule,
    ResourceDeletionModule,
    NotificationsModule,
  ],
  providers: [
    NotificationAutomationService,
    ExternalResourceCleanupService,
    NotificationDeliveryService,
    AuditProcessor,
    NotificationDeliveryProcessor,
    NotificationAutomationProcessor,
    RecurringDeliverablesProcessor,
    TransactionalEmailProcessor,
    ReportExportProcessor,
    ExternalResourceCleanupProcessor,
    VideoReconciliationProcessor,
    CalendarSyncProcessor,
    WorkerHeartbeatService,
  ],
})
export class WorkerModule {}
