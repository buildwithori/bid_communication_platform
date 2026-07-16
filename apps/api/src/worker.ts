import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./jobs/worker.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["log", "error", "warn"],
  });
  app.enableShutdownHooks();
  new Logger("WorkerBootstrap").log("BID Hub background worker is ready");
}

void bootstrap();
