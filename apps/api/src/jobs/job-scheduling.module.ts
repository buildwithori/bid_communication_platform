import { Module } from "@nestjs/common";
import { JobsModule } from "./jobs.module";
import { JobSchedulerService } from "./job-scheduler.service";

@Module({
  imports: [JobsModule],
  providers: [JobSchedulerService],
})
export class JobSchedulingModule {}
