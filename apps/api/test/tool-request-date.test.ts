import assert from "node:assert/strict";
import test from "node:test";
import {
  EntrepreneurToolStatus,
  ToolRequestStatus,
  UserRole,
} from "@prisma/client";
import { ToolRequestsService } from "../src/tools/tool-requests.service";

function dateInTimezone(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

test("tool requests reject needed-by dates up to and including today", async () => {
  const service = new ToolRequestsService(
    {} as never,
    {} as never,
    {} as never,
  );
  const today = dateInTimezone(new Date(), "Africa/Kigali");
  const yesterdayDate = new Date(`${today}T00:00:00.000Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  const user = {
    id: "entrepreneur-1",
    role: UserRole.entrepreneur,
    timezone: "Africa/Kigali",
  };

  for (const neededBy of [yesterday, today]) {
    await assert.rejects(
      service.createRequest(user as never, {
        title: "Cash flow tool",
        businessNeed: "We need a clearer cash flow forecast.",
        toolAreaId: "finance",
        neededBy,
      }),
      /Needed-by date must be after today/,
    );
  }
});

test("built tool requests clear the active note and notify with the linked resource", async () => {
  const existing = {
    id: "request-1",
    entrepreneurUserId: "entrepreneur-1",
    title: "Cash flow forecasting tool",
    businessNeed: "We need a clearer cash flow forecast.",
    toolAreaId: "finance",
    neededBy: null,
    status: ToolRequestStatus.in_development,
    linkedToolId: null,
    adminDecisionNote: "Development may take longer than expected.",
    decidedById: "admin-1",
    decidedAt: new Date("2026-07-22T10:00:00.000Z"),
    createdAt: new Date("2026-07-21T10:00:00.000Z"),
    updatedAt: new Date("2026-07-22T10:00:00.000Z"),
  };
  const linkedTool = {
    id: "tool-1",
    name: "Cash flow forecasting",
    status: EntrepreneurToolStatus.published,
  };
  const includedRequest = {
    ...existing,
    status: ToolRequestStatus.built,
    linkedToolId: linkedTool.id,
    adminDecisionNote: null,
    linkedTool,
    toolArea: { id: "finance", name: "Finance", key: "finance" },
    decidedBy: {
      id: "admin-1",
      firstName: "BID",
      lastName: "Admin",
      email: "admin@bid.org",
    },
    entrepreneurUser: {
      id: "entrepreneur-1",
      email: "founder@example.com",
      firstName: "Amina",
      lastName: "Founder",
      entrepreneurProgrammeGrants: [],
      businessMemberships: [],
    },
  };
  let persistedData: Record<string, unknown> | undefined;
  let auditPayload: Record<string, unknown> | undefined;
  let notificationBody = "";
  const prisma = {
    toolRequest: { findUnique: async () => existing },
    tool: {
      findUnique: async () => linkedTool,
      findFirst: async () => ({ id: linkedTool.id }),
    },
  };
  const audit = {
    capture: async (
      metadata: { payload: Record<string, unknown> },
      operation: (transaction: unknown) => Promise<unknown>,
    ) => {
      auditPayload = metadata.payload;
      return operation({
        toolRequest: {
          update: async ({ data }: { data: Record<string, unknown> }) => {
            persistedData = data;
            return { ...includedRequest, ...data };
          },
        },
      });
    },
  };
  const notifications = {
    createNotification: async ({ body }: { body: string }) => {
      notificationBody = body;
      return {};
    },
  };
  const service = new ToolRequestsService(
    prisma as never,
    audit as never,
    notifications as never,
  );

  const result = await service.updateRequest(
    { id: "admin-1", role: UserRole.admin } as never,
    existing.id,
    {
      status: ToolRequestStatus.built,
      linkedToolId: linkedTool.id,
      adminDecisionNote: existing.adminDecisionNote,
    },
  );

  assert.equal(persistedData?.adminDecisionNote, null);
  assert.equal(result.adminDecisionNote, null);
  assert.equal(
    auditPayload?.previousDecisionNote,
    existing.adminDecisionNote,
  );
  assert.equal(auditPayload?.nextDecisionNote, null);
  assert.doesNotMatch(notificationBody, /BID team note/);
  assert.match(
    notificationBody,
    /Available resource: Cash flow forecasting/,
  );

  const legacyResult = (service as any).mapRequest({
    ...includedRequest,
    adminDecisionNote: "A stale note on an older built request.",
  });
  assert.equal(legacyResult.adminDecisionNote, null);
});
