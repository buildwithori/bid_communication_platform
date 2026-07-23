import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";
import { IS_PUBLIC_KEY } from "../src/auth/decorators/public.decorator";
import { ROLES_KEY } from "../src/auth/decorators/roles.decorator";
import { DeepHealthService } from "../src/health/deep-health.service";
import { HealthController } from "../src/health/health.controller";

const unhealthySnapshot = {
  status: "unhealthy" as const,
  failed: ["objectStorage"],
  dependencies: {
    database: { status: "connected", latencyMs: 2 },
    backgroundJobs: { status: "connected", latencyMs: 4 },
    objectStorage: { status: "unavailable", latencyMs: 18 },
    emailDelivery: { status: "connected", latencyMs: 1 },
  },
  integrations: {
    calendar: { status: "configured" as const },
    video: { status: "configured" as const },
  },
};

const healthyDiagnostics = {
  issues: [],
  system: {},
  queues: [],
  workloads: {},
  backup: { status: "not_tracked" },
};

test("public health probe and detailed health route have separate access policies", () => {
  assert.equal(
    Reflect.getMetadata(
      IS_PUBLIC_KEY,
      HealthController.prototype.getHealth,
    ),
    true,
  );
  assert.deepEqual(
    Reflect.getMetadata(
      ROLES_KEY,
      HealthController.prototype.getHealthDetails,
    ),
    [UserRole.admin],
  );
  assert.equal(Reflect.getMetadata(IS_PUBLIC_KEY, HealthController), undefined);
});

test("admin health details return degraded dependency data without throwing", async () => {
  const controller = new HealthController(
    { get: () => "production" } as never,
    { status: async () => unhealthySnapshot } as never,
    { status: async () => healthyDiagnostics } as never,
  );

  const result = await controller.getHealthDetails();

  assert.equal(result.status, "unhealthy");
  assert.deepEqual(result.failed, ["objectStorage"]);
  assert.equal(result.dependencies.objectStorage.status, "unavailable");
  assert.equal(result.environment, "production");
  assert.equal(typeof result.runtime.uptimeSeconds, "number");
});

test("admin health details distinguish operational and degraded states", async () => {
  const healthySnapshot = {
    ...unhealthySnapshot,
    status: "ok" as const,
    failed: [],
    dependencies: {
      ...unhealthySnapshot.dependencies,
      objectStorage: { status: "connected" as const, latencyMs: 3 },
    },
  };
  const operational = new HealthController(
    { get: () => "production" } as never,
    { status: async () => healthySnapshot } as never,
    { status: async () => healthyDiagnostics } as never,
  );
  const degraded = new HealthController(
    { get: () => "production" } as never,
    { status: async () => healthySnapshot } as never,
    {
      status: async () => ({
        ...healthyDiagnostics,
        issues: [
          {
            key: "queue:test",
            severity: "warning",
            message: "A job is waiting too long.",
          },
        ],
      }),
    } as never,
  );

  assert.equal((await operational.getHealthDetails()).status, "operational");
  assert.equal((await degraded.getHealthDetails()).status, "degraded");
});

test("public health probe does not expose operational dependency details", async () => {
  const healthySnapshot = {
    ...unhealthySnapshot,
    status: "ok" as const,
    failed: [],
    dependencies: {
      ...unhealthySnapshot.dependencies,
      objectStorage: { status: "connected" as const, latencyMs: 3 },
    },
  };
  const controller = new HealthController(
    { get: () => "production" } as never,
    { status: async () => healthySnapshot } as never,
    { status: async () => healthyDiagnostics } as never,
  );

  const result = await controller.getHealth();

  assert.deepEqual(Object.keys(result).sort(), ["app", "status", "timestamp"]);
  assert.equal("dependencies" in result, false);
  assert.equal("environment" in result, false);
});

test("deep health reports stale recorded backups and bounded workload counts", async () => {
  const zeroCount = { count: async () => 0 };
  const service = new DeepHealthService(
    {
      videoAsset: zeroCount,
      videoWebhookEvent: {
        aggregate: async () => ({ _max: { receivedAt: null } }),
      },
      notificationDelivery: zeroCount,
      externalResourceDeletion: zeroCount,
      reportExport: zeroCount,
      auditOutbox: zeroCount,
      calendarConnection: zeroCount,
      deploymentTaskRun: {
        findUnique: async () => ({
          key: "database-backup-latest",
          completedAt: new Date(Date.now() - 30 * 60 * 60_000),
          details: null,
        }),
      },
    } as never,
    { diagnostics: async () => [] } as never,
  );

  const result = await service.status();

  assert.equal(result.backup.status, "tracked");
  assert.ok(result.backup.ageHours && result.backup.ageHours >= 29);
  assert.ok(result.issues.some((issue) => issue.key === "backup:stale"));
  assert.equal(result.workloads.video.stuckProcessing, 0);
  assert.equal(result.workloads.externalCleanup.exhausted, 0);
});
