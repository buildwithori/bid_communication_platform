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
    @InjectQueue(QUEUE_NAMES.notificationAutomation)
    private readonly notificationAutomationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.recurringDeliverables)
    private readonly recurringQueue: Queue,
    @InjectQueue(QUEUE_NAMES.externalResourceCleanup)
    private readonly externalCleanupQueue: Queue,
    @InjectQueue(QUEUE_NAMES.videoReconciliation)
    private readonly videoReconciliationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.calendarSync)
    private readonly calendarSyncQueue: Queue,
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
    const automationInterval = this.config.getOrThrow<number>(
      "NOTIFICATION_AUTOMATION_INTERVAL_MS",
    );
    const externalCleanupInterval = 30_000;
    const videoReconciliationInterval = this.config.getOrThrow<number>(
      "VIDEO_RECONCILIATION_INTERVAL_MS",
    );
    const calendarSyncInterval = this.config.getOrThrow<number>(
      "CALENDAR_SYNC_INTERVAL_MS",
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
        this.notificationAutomationQueue,
        "notification-automation-scheduler",
        JOB_NAMES.runNotificationAutomation,
        automationInterval,
      ),
      this.installScheduler(
        this.recurringQueue,
        "recurring-deliverables-scheduler",
        JOB_NAMES.syncRecurringDeliverables,
        recurringInterval,
      ),
      this.installScheduler(
        this.externalCleanupQueue,
        "external-resource-cleanup-scheduler",
        JOB_NAMES.cleanupExternalResources,
        externalCleanupInterval,
      ),
      this.installScheduler(
        this.videoReconciliationQueue,
        "video-reconciliation-scheduler",
        JOB_NAMES.reconcileVideoAssets,
        videoReconciliationInterval,
      ),
      this.installScheduler(
        this.calendarSyncQueue,
        "calendar-sync-scheduler",
        JOB_NAMES.reconcileCalendarEvents,
        calendarSyncInterval,
      ),
      this.installScheduler(
        this.calendarSyncQueue,
        "calendar-provisioning-scheduler",
        JOB_NAMES.reconcileCalendarProvisioning,
        calendarSyncInterval,
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
      this.notificationAutomationQueue.add(
        JOB_NAMES.runNotificationAutomation,
        {},
        this.startupOptions(
          JOB_NAMES.runNotificationAutomation,
          automationInterval,
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
      this.externalCleanupQueue.add(
        JOB_NAMES.cleanupExternalResources,
        {},
        this.startupOptions(
          JOB_NAMES.cleanupExternalResources,
          externalCleanupInterval,
        ),
      ),
      this.videoReconciliationQueue.add(
        JOB_NAMES.reconcileVideoAssets,
        {},
        this.startupOptions(
          JOB_NAMES.reconcileVideoAssets,
          videoReconciliationInterval,
        ),
      ),
      this.calendarSyncQueue.add(
        JOB_NAMES.reconcileCalendarEvents,
        {},
        this.startupOptions(
          JOB_NAMES.reconcileCalendarEvents,
          calendarSyncInterval,
        ),
      ),
      this.calendarSyncQueue.add(
        JOB_NAMES.reconcileCalendarProvisioning,
        {},
        this.startupOptions(
          JOB_NAMES.reconcileCalendarProvisioning,
          calendarSyncInterval,
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
