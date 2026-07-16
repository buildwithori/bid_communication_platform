import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { QUEUE_NAMES } from "./jobs.constants";
import type {
  TransactionalEmailJobDataMap,
  TransactionalEmailJobName,
} from "./jobs.types";

@Injectable()
export class TransactionalEmailQueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.transactionalEmail)
    private readonly queue: Queue,
  ) {}

  enqueue<Name extends TransactionalEmailJobName>(
    name: Name,
    data: TransactionalEmailJobDataMap[Name],
  ) {
    return this.queue.add(name, data, {
      attempts: 5,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: true,
      removeOnFail: { age: 86_400, count: 1_000 },
    });
  }
}
