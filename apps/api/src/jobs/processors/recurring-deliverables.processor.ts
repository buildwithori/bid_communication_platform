import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { RecurringDeliverableService } from "../../deliverables/recurring-deliverable.service";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs.constants";

@Processor(QUEUE_NAMES.recurringDeliverables, { concurrency: 1 })
export class RecurringDeliverablesProcessor extends WorkerHost {
  private readonly logger = new Logger(RecurringDeliverablesProcessor.name);

  constructor(private readonly recurring: RecurringDeliverableService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== JOB_NAMES.syncRecurringDeliverables) {
      throw new Error(`Unsupported recurring deliverable job: ${job.name}`);
    }
    const created = await this.recurring.ensureCurrent(0);
    if (created > 0) {
      this.logger.log(
        `Generated ${created} recurring deliverable occurrence(s)`,
      );
    }
    return { created };
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Recurring deliverable job ${job?.id ?? "unknown"} failed: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent("error")
  onError(error: Error) {
    this.logger.error("Recurring deliverable worker error", error.stack);
  }
}
