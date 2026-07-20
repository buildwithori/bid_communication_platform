import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "../audit/audit.module";
import { RequestContextModule } from "../common/request-context/request-context.module";
import { validateEnv } from "../config/env.validation";
import { DatabaseModule } from "../database/database.module";
import { DeliverableLifecycleModule } from "../deliverables/deliverable-lifecycle.module";
import { EmailModule } from "../email/email.module";
import { NotificationAutomationService } from "../notifications/notification-automation.service";
import { NotificationDeliveryService } from "../notifications/notification-delivery.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { ReportingModule } from "../reporting/reporting.module";
import { JobsModule } from "./jobs.module";
import { AuditProcessor } from "./processors/audit.processor";
import { NotificationDeliveryProcessor } from "./processors/notification-delivery.processor";
import { NotificationAutomationProcessor } from "./processors/notification-automation.processor";
import { RecurringDeliverablesProcessor } from "./processors/recurring-deliverables.processor";
import { ReportExportProcessor } from "./processors/report-export.processor";
import { TransactionalEmailProcessor } from "./processors/transactional-email.processor";
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
    JobsModule,
    AuditModule,
    DeliverableLifecycleModule,
    ReportingModule,
    NotificationsModule,
  ],
  providers: [
    NotificationAutomationService,
    NotificationDeliveryService,
    AuditProcessor,
    NotificationDeliveryProcessor,
    NotificationAutomationProcessor,
    RecurringDeliverablesProcessor,
    TransactionalEmailProcessor,
    ReportExportProcessor,
    WorkerHeartbeatService,
  ],
})
export class WorkerModule {}
