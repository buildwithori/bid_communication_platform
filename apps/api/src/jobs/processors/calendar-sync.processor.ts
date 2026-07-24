import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import {
  CalendarConnectionSyncJob,
  CalendarSyncQueueService,
} from "../../calendar/calendar-sync-queue.service";
import { CalendarSyncService } from "../../calendar/calendar-sync.service";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs.constants";

@Processor(QUEUE_NAMES.calendarSync, { concurrency: 2 })
export class CalendarSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CalendarSyncProcessor.name);

  constructor(
    private readonly sync: CalendarSyncService,
    private readonly queue: CalendarSyncQueueService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === JOB_NAMES.reconcileCalendarEvents) {
      const cursor = (job.data as { cursor?: string }).cursor;
      const [reconciliation, watches] = await Promise.all([
        this.sync.enqueueScheduledReconciliation(cursor),
        this.sync.maintainWatchChannels(),
      ]);
      const nextCursor = reconciliation.nextCursor;
      if (nextCursor) {
        await this.queue.enqueueSweep(nextCursor);
      }
      return { reconciliation, watches };
    }
    if (job.name === JOB_NAMES.reconcileCalendarConnection) {
      const data = job.data as CalendarConnectionSyncJob;
      const result = await this.sync.reconcileConnection(data);
      if (result.nextCursor) {
        await this.queue.enqueueConnection({
          ...data,
          cursor: result.nextCursor,
        });
      }
      return result;
    }
    throw new Error(`Unsupported calendar sync job: ${job.name}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      JSON.stringify({
        event: "calendar.sync.failed",
        jobId: job?.id ?? "unknown",
        jobName: job?.name ?? "unknown",
        error: error.name,
      }),
    );
  }
}
