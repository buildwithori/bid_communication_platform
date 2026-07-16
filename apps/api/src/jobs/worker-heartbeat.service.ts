import { InjectQueue } from "@nestjs/bullmq";
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { QUEUE_NAMES, WORKER_HEARTBEAT_KEY } from "./jobs.constants";

const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TTL_SECONDS = 20;

type HeartbeatRedisClient = {
  set(
    key: string,
    value: string,
    mode: "EX",
    duration: number,
  ): Promise<unknown>;
};

@Injectable()
export class WorkerHeartbeatService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(WorkerHeartbeatService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectQueue(QUEUE_NAMES.audit)
    private readonly queue: Queue,
  ) {}

  async onApplicationBootstrap() {
    await this.writeHeartbeat();
    this.timer = setInterval(
      () =>
        void this.writeHeartbeat().catch((error: unknown) => {
          this.logger.error(
            "Unable to update worker heartbeat",
            error instanceof Error ? error.stack : String(error),
          );
        }),
      HEARTBEAT_INTERVAL_MS,
    );
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async writeHeartbeat() {
    const client = (await this.queue.client) as unknown as HeartbeatRedisClient;
    await client.set(
      WORKER_HEARTBEAT_KEY,
      new Date().toISOString(),
      "EX",
      HEARTBEAT_TTL_SECONDS,
    );
  }
}
