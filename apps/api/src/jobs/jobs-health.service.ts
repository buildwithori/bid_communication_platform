import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { QUEUE_NAMES, WORKER_HEARTBEAT_KEY } from "./jobs.constants";

@Injectable()
export class JobsHealthService {
  constructor(
    @InjectQueue(QUEUE_NAMES.audit)
    private readonly auditQueue: Queue,
    @InjectQueue(QUEUE_NAMES.notificationDelivery)
    private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.notificationAutomation)
    private readonly notificationAutomationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.recurringDeliverables)
    private readonly recurringQueue: Queue,
    @InjectQueue(QUEUE_NAMES.transactionalEmail)
    private readonly transactionalEmailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.reportExports)
    private readonly reportExportQueue: Queue,
    @InjectQueue(QUEUE_NAMES.externalResourceCleanup)
    private readonly externalCleanupQueue: Queue,
  ) {}

  async status() {
    await this.waitUntilReady();

    const heartbeatClient = (await this.auditQueue.client) as unknown as {
      get(key: string): Promise<string | null>;
    };
    const workerHeartbeat = await heartbeatClient.get(WORKER_HEARTBEAT_KEY);
    const workerHeartbeatAt = workerHeartbeat
      ? new Date(workerHeartbeat)
      : null;
    if (
      !workerHeartbeatAt ||
      Number.isNaN(workerHeartbeatAt.getTime()) ||
      Date.now() - workerHeartbeatAt.getTime() > 20_000
    ) {
      throw new Error("Background worker heartbeat is missing or stale.");
    }

    const queues = await Promise.all(
      [
        this.auditQueue,
        this.notificationQueue,
        this.notificationAutomationQueue,
        this.recurringQueue,
        this.transactionalEmailQueue,
        this.reportExportQueue,
        this.externalCleanupQueue,
      ].map(async (queue) => ({
        name: queue.name,
        counts: await queue.getJobCounts("wait", "active", "delayed", "failed"),
      })),
    );

    return {
      status: "connected",
      worker: {
        status: "running",
        heartbeatAt: workerHeartbeatAt.toISOString(),
      },
      queues,
    };
  }

  private async waitUntilReady() {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.auditQueue.waitUntilReady(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Redis queue health check timed out.")),
            2_000,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
