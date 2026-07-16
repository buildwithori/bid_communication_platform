import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../src/auth/decorators/roles.decorator";
import { ReportExportService } from "../src/reporting/report-export.service";
import { ReportingController } from "../src/reporting/reporting.controller";
import { ReportingService } from "../src/reporting/reporting.service";

test("reporting controller is explicitly admin scoped", () => {
  assert.deepEqual(Reflect.getMetadata(ROLES_KEY, ReportingController), [
    UserRole.admin,
  ]);
});

test("date-only report end includes the complete UTC day", () => {
  const service = new ReportingService({} as never, {} as never);
  const period = service.resolvePeriod({
    dateFrom: "2026-01-01",
    dateTo: "2026-12-31",
  });
  assert.equal(period.from.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(period.to.toISOString(), "2026-12-31T23:59:59.999Z");
});

test("overdue queue uses cursor lookahead without returning the extra row", async () => {
  const rows = ["one", "two", "lookahead"].map((id) => ({
    id,
    joinedAt: new Date("2025-01-01T00:00:00.000Z"),
    user: {
      id: `user-${id}`,
      firstName: "Test",
      lastName: "Entrepreneur",
      email: `${id}@example.com`,
      periodicUpdates: [],
      entrepreneurProgrammeGrants: [],
    },
    business: { id: `business-${id}`, name: `Business ${id}` },
  }));
  const prisma = {
    companySettings: {
      findUnique: async () => ({ periodicUpdateOverdueAfterDays: 30 }),
    },
    businessMembership: {
      findMany: async () => rows,
      count: async () => 8,
    },
  };
  const service = new ReportingService(prisma as never, {} as never);
  const page = await service.overdueUpdates({ take: 2 });

  assert.deepEqual(
    page.items.map((item) => item.id),
    ["one", "two"],
  );
  assert.equal(page.nextCursor, "two");
  assert.equal(page.totalItems, 8);
});

test("reporting reminder rechecks overdue scope and creates a linked notification", async () => {
  const created: unknown[] = [];
  const prisma = {
    companySettings: {
      findUnique: async () => ({ periodicUpdateOverdueAfterDays: 30 }),
    },
    businessMembership: {
      findFirst: async () => ({ userId: "entrepreneur-1" }),
    },
  };
  const notifications = {
    createNotification: async (input: unknown) => {
      created.push(input);
      return { id: "notification-1" };
    },
  };
  const service = new ReportingService(prisma as never, notifications as never);
  const result = await service.sendReminder(
    { id: "admin-1" } as never,
    "entrepreneur-1",
    {
      subject: "Periodic update reminder",
      message: "Please submit your latest update.",
      channel: "in_app",
    },
  );

  assert.deepEqual(result, { id: "notification-1" });
  assert.deepEqual(created[0], {
    recipientUserId: "entrepreneur-1",
    actorUserId: "admin-1",
    type: "system",
    title: "Periodic update reminder",
    body: "Please submit your latest update.",
    severity: "warning",
    entityType: "entrepreneur",
    entityId: "entrepreneur-1",
    actionUrl: "/entrepreneur/profile",
    channels: ["in_app"],
  });
});

test("report export status is scoped to the requesting admin", async () => {
  const calls: unknown[] = [];
  const prisma = {
    reportExport: {
      findFirst: async (args: unknown) => {
        calls.push(args);
        return {
          id: "export-1",
          format: "csv",
          status: "queued",
          programmeId: null,
          programme: null,
          dateFrom: new Date("2026-01-01T00:00:00.000Z"),
          dateTo: new Date("2026-12-31T23:59:59.999Z"),
          fileAssetId: null,
          failureReason: null,
          createdAt: new Date("2026-07-16T00:00:00.000Z"),
          completedAt: null,
          expiresAt: null,
        };
      },
    },
  };
  const service = new ReportExportService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  await service.get({ id: "admin-1" } as never, "export-1");

  assert.deepEqual(calls[0], {
    where: { id: "export-1", requestedById: "admin-1" },
    include: { programme: { select: { name: true } } },
  });
});
