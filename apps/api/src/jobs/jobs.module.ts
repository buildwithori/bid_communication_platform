import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QUEUE_NAMES, QUEUE_PREFIX } from "./jobs.constants";
import { redisConnectionFromUrl } from "./redis-connection";
import { TransactionalEmailQueueService } from "./transactional-email-queue.service";
import { JobsHealthService } from "./jobs-health.service";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnectionFromUrl(
          config.getOrThrow<string>("REDIS_URL"),
        ),
        prefix: QUEUE_PREFIX,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 2_000 },
          removeOnComplete: { age: 3_600, count: 1_000 },
          removeOnFail: { age: 604_800, count: 5_000 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.audit },
      { name: QUEUE_NAMES.notificationDelivery },
      { name: QUEUE_NAMES.recurringDeliverables },
      { name: QUEUE_NAMES.transactionalEmail },
      { name: QUEUE_NAMES.reportExports },
    ),
  ],
  providers: [TransactionalEmailQueueService, JobsHealthService],
  exports: [BullModule, TransactionalEmailQueueService, JobsHealthService],
})
export class JobsModule {}
