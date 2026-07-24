import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs/jobs.constants";

export type CalendarConnectionSyncJob = {
  connectionId: string;
  cursor?: string;
  source: "webhook" | "reconciliation";
};

export type SessionCalendarProvisioningJob = {
  sessionId: string;
};

@Injectable()
export class CalendarSyncQueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.calendarSync)
    private readonly queue: Queue,
  ) {}

  enqueueConnection(data: CalendarConnectionSyncJob, dedupeKey?: string) {
    return this.queue.add(JOB_NAMES.reconcileCalendarConnection, data, {
      ...(dedupeKey ? { jobId: dedupeKey } : {}),
    });
  }

  enqueueSweep(cursor: string) {
    return this.queue.add(JOB_NAMES.reconcileCalendarEvents, { cursor });
  }

  enqueueProvisioningSweep(cursor?: string) {
    return this.queue.add(JOB_NAMES.reconcileCalendarProvisioning, { cursor });
  }

  enqueueSessionProvisioning(sessionId: string) {
    return this.queue.add(JOB_NAMES.provisionSessionCalendar, { sessionId });
  }
}
