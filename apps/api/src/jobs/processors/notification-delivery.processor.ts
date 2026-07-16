import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { NotificationDeliveryService } from "../../notifications/notification-delivery.service";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs.constants";

@Processor(QUEUE_NAMES.notificationDelivery, { concurrency: 1 })
export class NotificationDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationDeliveryProcessor.name);

  constructor(private readonly delivery: NotificationDeliveryService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== JOB_NAMES.deliverNotifications) {
      throw new Error(`Unsupported notification job: ${job.name}`);
    }
    let processed = 0;
    for (let batch = 0; batch < 20; batch += 1) {
      const result = await this.delivery.processPending();
      processed += result.processed;
      if (!result.hasMore) break;
    }
    if (processed > 0) {
      this.logger.log(`Processed ${processed} notification email(s)`);
    }
    return { processed };
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Notification job ${job?.id ?? "unknown"} failed: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent("error")
  onError(error: Error) {
    this.logger.error("Notification worker error", error.stack);
  }
}
