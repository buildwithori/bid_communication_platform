import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../src/auth/decorators/roles.decorator";
import { DashboardsController } from "../src/dashboards/dashboards.controller";
import { DashboardsService } from "../src/dashboards/dashboards.service";

test("dashboard controller endpoints are explicitly role scoped", () => {
  assert.deepEqual(
    Reflect.getMetadata(ROLES_KEY, DashboardsController.prototype.adminDashboard),
    [UserRole.admin],
  );
  assert.deepEqual(
    Reflect.getMetadata(ROLES_KEY, DashboardsController.prototype.trainerDashboard),
    [UserRole.trainer],
  );
  assert.deepEqual(
    Reflect.getMetadata(ROLES_KEY, DashboardsController.prototype.entrepreneurDashboard),
    [UserRole.entrepreneur],
  );
});

test("entrepreneur dashboard scopes every preview query to the authenticated user", async () => {
  const calls: Array<{ resource: string; args: any }> = [];
  const capture = (resource: string, value: unknown) => async (args: unknown) => {
    calls.push({ resource, args });
    return value;
  };
  const prisma = {
    businessMembership: {
      findFirst: capture("membership", { business: { name: "Scoped Business" } }),
    },
    learnerProgrammeProgress: {
      aggregate: capture("progress", {
        _avg: { progressPercent: 25 },
        _sum: { completedContentCount: 1, totalContentCount: 4 },
        _count: { _all: 1 },
      }),
    },
    deliverableInstance: {
      groupBy: capture("deliverable-groups", []),
      findMany: capture("deliverables", []),
    },
    session: { findMany: capture("sessions", []) },
    notification: { findMany: capture("notifications", []) },
    $queryRaw: capture("trend", []),
  };
  const service = new DashboardsService(prisma as never);
  const result = await service.entrepreneurDashboard({
    id: "entrepreneur-1",
    role: UserRole.entrepreneur,
  } as never);

  assert.equal(result.entrepreneur.businessName, "Scoped Business");
  assert.equal(result.metrics.trainingProgress, 25);
  assert.equal((calls.find((call) => call.resource === "membership")?.args as any).where.userId, "entrepreneur-1");
  assert.equal((calls.find((call) => call.resource === "progress")?.args as any).where.entrepreneurUserId, "entrepreneur-1");
  assert.equal((calls.find((call) => call.resource === "sessions")?.args as any).where.entrepreneurUserId, "entrepreneur-1");
  assert.equal((calls.find((call) => call.resource === "notifications")?.args as any).where.recipientUserId, "entrepreneur-1");
});

test("recent entrepreneur dashboard queue is cursor paginated and never returns the lookahead row", async () => {
  const row = (id: string) => ({
    id,
    joinedAt: new Date("2026-07-16T00:00:00.000Z"),
    user: {
      id: `user-${id}`,
      firstName: "Ada",
      lastName: "Founder",
      email: `${id}@bid.test`,
      status: "active",
      _count: { entrepreneurProgrammeGrants: 0 },
    },
    business: {
      name: `Business ${id}`,
      source: "self_registered",
      status: "active",
      sector: null,
      stage: null,
    },
  });
  let findArgs: any;
  const service = new DashboardsService({
    businessMembership: {
      findMany: async (args: unknown) => {
        findArgs = args;
        return [row("1"), row("2"), row("lookahead")];
      },
      count: async () => 9,
    },
  } as never);

  const page = await service.adminRecentEntrepreneurs({ take: 2 });

  assert.equal(findArgs.take, 3);
  assert.equal(page.items.length, 2);
  assert.equal(page.nextCursor, "2");
  assert.equal(page.totalItems, 9);
});
