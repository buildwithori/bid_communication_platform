import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { ExternalResourceCleanupService } from "../external-resource-cleanup.service";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs.constants";

@Processor(QUEUE_NAMES.externalResourceCleanup, { concurrency: 2 })
export class ExternalResourceCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(ExternalResourceCleanupProcessor.name);

  constructor(private readonly cleanup: ExternalResourceCleanupService) {
    super();
  }

  process(job: Job) {
    if (job.name !== JOB_NAMES.cleanupExternalResources) {
      throw new Error(`Unsupported external cleanup job: ${job.name}`);
    }
    return this.cleanup.processPending();
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `External cleanup job ${job?.id ?? "unknown"} failed: ${error.message}`,
      error.stack,
    );
  }
}
