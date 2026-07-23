import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@prisma/client";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { OperationalHealthService } from "./operational-health.service";

@Controller()
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly operational: OperationalHealthService,
  ) {}

  @Get("health")
  @Public()
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
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health/details")
  @Roles(UserRole.admin)
  async getHealthDetails() {
    const health = await this.operational.status();
    return {
      app: "BID Hub",
      status: health.status,
      failed: health.failed,
      environment: this.config.get<string>("NODE_ENV") ?? "unknown",
      runtime: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
      },
      dependencies: health.dependencies,
      integrations: health.integrations,
      timestamp: new Date().toISOString(),
    };
  }
}
