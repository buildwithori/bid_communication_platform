import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "../audit/audit.module";
import { RequestContextModule } from "../common/request-context/request-context.module";
import { validateEnv } from "../config/env.validation";
import { DatabaseModule } from "../database/database.module";
import { DeliverableLifecycleModule } from "../deliverables/deliverable-lifecycle.module";
import { EmailModule } from "../email/email.module";
import { NotificationDeliveryService } from "../notifications/notification-delivery.service";
import { JobsModule } from "./jobs.module";
import { AuditProcessor } from "./processors/audit.processor";
import { NotificationDeliveryProcessor } from "./processors/notification-delivery.processor";
import { RecurringDeliverablesProcessor } from "./processors/recurring-deliverables.processor";
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
  ],
  providers: [
    NotificationDeliveryService,
    AuditProcessor,
    NotificationDeliveryProcessor,
    RecurringDeliverablesProcessor,
    TransactionalEmailProcessor,
    WorkerHeartbeatService,
  ],
})
export class WorkerModule {}
