import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../auth/decorators/public.decorator";
import { JobsHealthService } from "../jobs/jobs-health.service";

@Public()
@Controller()
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly jobs: JobsHealthService,
  ) {}

  @Get("health")
  async getHealth() {
    try {
      const backgroundJobs = await this.jobs.status();
      return {
        app: "BID Hub",
        status: "ok",
        environment: this.config.get("NODE_ENV"),
        backgroundJobs,
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        app: "BID Hub",
        status: "unhealthy",
        dependency: "background-jobs",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
