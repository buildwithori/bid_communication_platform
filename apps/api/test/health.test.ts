import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";
import { IS_PUBLIC_KEY } from "../src/auth/decorators/public.decorator";
import { ROLES_KEY } from "../src/auth/decorators/roles.decorator";
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
  );

  const result = await controller.getHealthDetails();

  assert.equal(result.status, "unhealthy");
  assert.deepEqual(result.failed, ["objectStorage"]);
  assert.equal(result.dependencies.objectStorage.status, "unavailable");
  assert.equal(result.environment, "production");
  assert.equal(typeof result.runtime.uptimeSeconds, "number");
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
  );

  const result = await controller.getHealth();

  assert.deepEqual(Object.keys(result).sort(), ["app", "status", "timestamp"]);
  assert.equal("dependencies" in result, false);
  assert.equal("environment" in result, false);
});
