import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { AuditService } from "../../audit/audit.service";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs.constants";

@Processor(QUEUE_NAMES.audit, { concurrency: 1 })
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(private readonly audit: AuditService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== JOB_NAMES.processAuditOutbox) {
      throw new Error(`Unsupported audit job: ${job.name}`);
    }
    let processed = 0;
    let failed = 0;
    for (let batch = 0; batch < 20; batch += 1) {
      const result = await this.audit.processPending();
      processed += result.processed;
      failed += result.failed;
      if (!result.hasMore) break;
    }
    if (processed > 0 || failed > 0) {
      this.logger.log(
        `Audit outbox run: ${processed} processed, ${failed} failed`,
      );
    }
    return { processed, failed };
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Audit job ${job?.id ?? "unknown"} failed: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent("error")
  onError(error: Error) {
    this.logger.error("Audit worker error", error.stack);
  }
}
