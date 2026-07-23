import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@prisma/client";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { DeepHealthService } from "./deep-health.service";
import { OperationalHealthService } from "./operational-health.service";

@Controller()
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly operational: OperationalHealthService,
    private readonly deepHealth: DeepHealthService,
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
    const [health, diagnostics] = await Promise.all([
      this.operational.status(),
      this.deepHealth.status().catch(() => null),
    ]);
    const criticalDiagnostic = diagnostics?.issues.some(
      (issue) => issue.severity === "critical",
    );
    const warningDiagnostic = diagnostics?.issues.some(
      (issue) => issue.severity === "warning",
    );
    const status =
      health.status === "unhealthy" || criticalDiagnostic
        ? ("unhealthy" as const)
        : !diagnostics || warningDiagnostic
          ? ("degraded" as const)
          : ("operational" as const);
    return {
      app: "BID Hub",
      status,
      readinessStatus: health.status,
      failed: health.failed,
      environment: this.config.get<string>("NODE_ENV") ?? "unknown",
      runtime: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
      },
      dependencies: health.dependencies,
      integrations: health.integrations,
      diagnostics,
      timestamp: new Date().toISOString(),
    };
  }
}
