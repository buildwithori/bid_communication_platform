import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { NotificationAutomationService } from "../../notifications/notification-automation.service";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs.constants";

@Processor(QUEUE_NAMES.notificationAutomation, { concurrency: 1 })
export class NotificationAutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationAutomationProcessor.name);

  constructor(private readonly automation: NotificationAutomationService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== JOB_NAMES.runNotificationAutomation) {
      throw new Error(`Unsupported notification automation job: ${job.name}`);
    }
    const result = await this.automation.process();
    const total =
      result.sessionReminders +
      result.deliverableReminders +
      result.weeklyDigests;
    if (total > 0) {
      this.logger.log(
        JSON.stringify({
          event: "notification.automation.completed",
          ...result,
        }),
      );
    }
    return result;
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      JSON.stringify({
        event: "notification.automation.failed",
        jobId: job?.id ?? "unknown",
        jobName: job?.name ?? "unknown",
        error: error.name,
      }),
    );
  }

  @OnWorkerEvent("error")
  onError(error: Error) {
    this.logger.error(
      JSON.stringify({
        event: "notification.automation.worker_failed",
        error: error.name,
      }),
    );
  }
}
