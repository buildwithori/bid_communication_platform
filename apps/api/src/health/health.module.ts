import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import { JobsModule } from "../jobs/jobs.module";
import { HealthController } from "./health.controller";
import { OperationalHealthService } from "./operational-health.service";

@Module({
  imports: [FilesModule, JobsModule],
  controllers: [HealthController],
  providers: [OperationalHealthService],
})
export class HealthModule {}
