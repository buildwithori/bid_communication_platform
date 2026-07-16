import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { ReportExportService } from "../../reporting/report-export.service";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs.constants";

@Processor(QUEUE_NAMES.reportExports, { concurrency: 2 })
export class ReportExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportExportProcessor.name);

  constructor(private readonly exports: ReportExportService) {
    super();
  }

  async process(job: Job<{ reportExportId: string }>) {
    if (job.name !== JOB_NAMES.generateReportExport) {
      throw new Error(`Unsupported report export job: ${job.name}`);
    }
    return this.exports.process(job.data.reportExportId);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Report export job ${job?.id ?? "unknown"} failed: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent("error")
  onError(error: Error) {
    this.logger.error("Report export worker error", error.stack);
  }
}
