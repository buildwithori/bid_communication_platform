import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { VideoService } from "../../video/video.service";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs.constants";

@Processor(QUEUE_NAMES.videoReconciliation, { concurrency: 1 })
export class VideoReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoReconciliationProcessor.name);

  constructor(private readonly videos: VideoService) {
    super();
  }

  process(job: Job) {
    if (job.name !== JOB_NAMES.reconcileVideoAssets) {
      throw new Error(`Unsupported video reconciliation job: ${job.name}`);
    }
    return this.videos.reconcileStaleAssets();
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Video reconciliation job ${job?.id ?? "unknown"} failed: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent("error")
  onError(error: Error) {
    this.logger.error("Video reconciliation worker error", error.stack);
  }
}
