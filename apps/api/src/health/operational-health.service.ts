import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";
import { EmailHealthService } from "../email/email-health.service";
import { StorageService } from "../files/storage.service";
import { JobsHealthService } from "../jobs/jobs-health.service";

type DependencyStatus = {
  status: "connected" | "unavailable";
  latencyMs: number;
  details?: unknown;
};

@Injectable()
export class OperationalHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsHealthService,
    private readonly storage: StorageService,
    private readonly email: EmailHealthService,
    private readonly config: ConfigService,
  ) {}

  async status() {
    const [database, backgroundJobs, objectStorage, emailDelivery] =
      await Promise.all([
        this.check(async () => {
          await this.prisma.$queryRaw`SELECT 1`;
          return { provider: "postgresql" };
        }),
        this.check(() => this.jobs.status()),
        this.check(() => this.storage.healthCheck()),
        this.check(() => this.email.healthCheck()),
      ]);
    const dependencies = {
      database,
      backgroundJobs,
      objectStorage,
      emailDelivery,
    };
    const failed = Object.entries(dependencies)
      .filter(([, dependency]) => dependency.status === "unavailable")
      .map(([name]) => name);

    return {
      status: failed.length ? ("unhealthy" as const) : ("ok" as const),
      failed,
      dependencies,
      integrations: {
        calendar: this.configurationStatus([
          "GOOGLE_CLIENT_ID",
          "GOOGLE_CLIENT_SECRET",
          "CALENDAR_TOKEN_ENCRYPTION_KEY",
        ]),
        video: this.configurationStatus([
          "MUX_TOKEN_ID",
          "MUX_TOKEN_SECRET",
          "MUX_WEBHOOK_SECRET",
          "MUX_SIGNING_KEY_ID",
          "MUX_SIGNING_PRIVATE_KEY",
        ]),
      },
    };
  }

  private async check(
    operation: () => Promise<unknown>,
  ): Promise<DependencyStatus> {
    const startedAt = Date.now();
    try {
      return {
        status: "connected",
        latencyMs: Date.now() - startedAt,
        details: await operation(),
      };
    } catch {
      return {
        status: "unavailable",
        latencyMs: Date.now() - startedAt,
      };
    }
  }

  private configurationStatus(keys: string[]) {
    const configured = keys.every((key) =>
      Boolean(this.config.get<string>(key)?.trim()),
    );
    return {
      status: configured
        ? ("configured" as const)
        : ("not_configured" as const),
    };
  }
}
