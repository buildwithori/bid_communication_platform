import { Module } from "@nestjs/common";
import { EmailHealthModule } from "../email/email-health.module";
import { FilesModule } from "../files/files.module";
import { JobsModule } from "../jobs/jobs.module";
import { DeepHealthService } from "./deep-health.service";
import { HealthController } from "./health.controller";
import { OperationalHealthService } from "./operational-health.service";

@Module({
  imports: [EmailHealthModule, FilesModule, JobsModule],
  controllers: [HealthController],
  providers: [OperationalHealthService, DeepHealthService],
})
export class HealthModule {}
