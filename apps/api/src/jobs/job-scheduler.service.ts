import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JobsOptions, Queue } from "bullmq";
import { JOB_NAMES, QUEUE_NAMES } from "./jobs.constants";

const SCHEDULER_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2_000 },
  removeOnComplete: { age: 3_600, count: 1_000 },
  removeOnFail: { age: 604_800, count: 5_000 },
};

@Injectable()
export class JobSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.audit)
    private readonly auditQueue: Queue,
    @InjectQueue(QUEUE_NAMES.notificationDelivery)
    private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.recurringDeliverables)
    private readonly recurringQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const auditInterval = this.config.getOrThrow<number>(
      "AUDIT_PROCESS_INTERVAL_MS",
    );
    const notificationInterval = this.config.getOrThrow<number>(
      "NOTIFICATION_DELIVERY_INTERVAL_MS",
    );
    const recurringInterval = this.config.getOrThrow<number>(
      "DELIVERABLE_RECURRENCE_INTERVAL_MS",
    );

    await Promise.all([
      this.installScheduler(
        this.auditQueue,
        "audit-outbox-scheduler",
        JOB_NAMES.processAuditOutbox,
        auditInterval,
      ),
      this.installScheduler(
        this.notificationQueue,
        "notification-delivery-scheduler",
        JOB_NAMES.deliverNotifications,
        notificationInterval,
      ),
      this.installScheduler(
        this.recurringQueue,
        "recurring-deliverables-scheduler",
        JOB_NAMES.syncRecurringDeliverables,
        recurringInterval,
      ),
    ]);

    await Promise.all([
      this.auditQueue.add(
        JOB_NAMES.processAuditOutbox,
        {},
        this.startupOptions(JOB_NAMES.processAuditOutbox, auditInterval),
      ),
      this.notificationQueue.add(
        JOB_NAMES.deliverNotifications,
        {},
        this.startupOptions(
          JOB_NAMES.deliverNotifications,
          notificationInterval,
        ),
      ),
      this.recurringQueue.add(
        JOB_NAMES.syncRecurringDeliverables,
        {},
        this.startupOptions(
          JOB_NAMES.syncRecurringDeliverables,
          recurringInterval,
        ),
      ),
    ]);
    this.logger.log("BullMQ job schedulers are registered");
  }

  private startupOptions(jobName: string, interval: number): JobsOptions {
    return {
      ...SCHEDULER_JOB_OPTIONS,
      jobId: `bootstrap-${jobName}-${Math.floor(Date.now() / interval)}`,
    };
  }

  private installScheduler(
    queue: Queue,
    schedulerId: string,
    jobName: string,
    every: number,
  ) {
    return queue.upsertJobScheduler(
      schedulerId,
      { every },
      {
        name: jobName,
        data: {},
        opts: SCHEDULER_JOB_OPTIONS,
      },
    );
  }
}
