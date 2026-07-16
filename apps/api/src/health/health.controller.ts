import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../auth/decorators/public.decorator";
import { OperationalHealthService } from "./operational-health.service";

@Public()
@Controller()
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly operational: OperationalHealthService,
  ) {}

  @Get("health")
  async getHealth() {
    const health = await this.operational.status();
    if (health.status === "unhealthy") {
      throw new ServiceUnavailableException(
        `Required dependencies unavailable: ${health.failed.join(", ")}.`,
      );
    }
    return {
      app: "BID Hub",
      status: health.status,
      environment: this.config.get("NODE_ENV"),
      dependencies: health.dependencies,
      integrations: health.integrations,
      timestamp: new Date().toISOString(),
    };
  }
}
