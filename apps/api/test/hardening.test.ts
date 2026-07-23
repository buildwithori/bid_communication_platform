import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  EntrepreneurToolStatus,
  EntrepreneurToolType,
  EntrepreneurToolVisibility,
  ReportExportFormat,
  ReportExportStatus,
  TrainerAccessLevel,
  TrainerCapabilityStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { AuthService } from "../src/auth/auth.service";
import { DeliverablesService } from "../src/deliverables/deliverables.service";
import { ApiExceptionFilter } from "../src/common/filters/api-exception.filter";
import type { RequestWithContext } from "../src/common/request-context/request-context.types";
import {
  RequestIdMiddleware,
  safeHttpPath,
} from "../src/common/request-context/request-id.middleware";
import { RequestContextService } from "../src/common/request-context/request-context.service";
import { IntegrationLoggerService } from "../src/common/observability/integration-logger.service";
import { normalizeTraceId } from "../src/common/request-context/trace-id";
import { OperationalHealthService } from "../src/health/operational-health.service";
import { ReportExportService } from "../src/reporting/report-export.service";
import { ToolsService } from "../src/tools/tools.service";
import { LearningService } from "../src/learning/learning.service";
import {
  activeTrainerUserWhere,
  trainerCapabilityAllowsAccess,
} from "../src/trainers/trainer-access";

test("trainer eligibility excludes expired guest access", () => {
  const now = new Date("2026-07-23T00:00:00.000Z");
  assert.equal(
    trainerCapabilityAllowsAccess(
      {
        accessLevel: TrainerAccessLevel.guest,
        accessExpiresOn: new Date("2026-07-22T23:59:59.000Z"),
        status: TrainerCapabilityStatus.active,
      },
      now,
    ),
    false,
  );
  assert.equal(
    trainerCapabilityAllowsAccess(
      {
        accessLevel: TrainerAccessLevel.full,
        accessExpiresOn: null,
        status: TrainerCapabilityStatus.active,
      },
      now,
    ),
    true,
  );
  assert.deepEqual(activeTrainerUserWhere(now), {
    role: UserRole.trainer,
    status: UserStatus.active,
    trainerCapability: {
      is: {
        status: TrainerCapabilityStatus.active,
        OR: [
          { accessLevel: TrainerAccessLevel.full },
          {
            accessLevel: TrainerAccessLevel.guest,
            accessExpiresOn: { gt: now },
          },
        ],
      },
    },
  });
});

test("expired trainer sessions are rejected and revoked", async () => {
  let revokedReason: string | undefined;
  const prisma = {
    refreshToken: {
      findFirst: async () => ({ id: "session-1", userId: "trainer-1" }),
      updateMany: async (query: { data: { revokedReason: string } }) => {
        revokedReason = query.data.revokedReason;
        return { count: 1 };
      },
    },
    user: {
      findUnique: async () => ({
        id: "trainer-1",
        role: UserRole.trainer,
        status: UserStatus.active,
        trainerCapability: {
          accessLevel: TrainerAccessLevel.guest,
          accessExpiresOn: new Date("2026-07-22T00:00:00.000Z"),
          status: TrainerCapabilityStatus.active,
        },
      }),
    },
  };
  const service = new AuthService(prisma as never, {} as never, {} as never);

  assert.equal(await service.validateSession("expired-session"), null);
  assert.equal(revokedReason, "trainer_access_expired");
});

test("learner progress rejects a playback position beyond its duration", async () => {
  const service = new LearningService({
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
      operation({}),
  } as never);

  await assert.rejects(
    service.syncProgress(
      { id: "entrepreneur-1", role: UserRole.entrepreneur } as never,
      {
        items: [
          {
            programmeId: "programme-1",
            moduleId: "module-1",
            contentItemId: "content-1",
            status: "in_progress",
            progressPercent: 50,
            lastPositionSeconds: 301,
            durationSeconds: 300,
            clientEventAt: new Date().toISOString(),
            source: "player",
          },
        ],
      },
    ),
    BadRequestException,
  );
});

test("position-only playback checkpoints skip aggregate recomputation", async () => {
  let aggregateRead = false;
  let savedPosition: number | undefined;
  const tx = {
    programme: {
      findFirst: async () => ({ id: "programme-1" }),
      findUnique: async () => {
        aggregateRead = true;
        return null;
      },
    },
    learnerContentProgress: {
      findUnique: async () => ({
        completedAt: null,
        progressPercent: 25,
        startedAt: new Date("2026-07-01T00:00:00.000Z"),
        status: "in_progress",
        lastSyncedAt: new Date("2026-07-01T00:01:00.000Z"),
        durationSeconds: 600,
        lastPositionSeconds: 150,
      }),
      upsert: async (query: any) => {
        savedPosition = query.update.lastPositionSeconds;
        return {};
      },
    },
  };
  const service = new LearningService({
    $transaction: async (operation: (client: typeof tx) => Promise<unknown>) =>
      operation(tx),
  } as never);

  const result = await service.syncProgress(
    { id: "entrepreneur-1", role: UserRole.entrepreneur } as never,
    {
      items: [
        {
          programmeId: "programme-1",
          moduleId: "module-1",
          contentItemId: "content-1",
          status: "in_progress",
          progressPercent: 25,
          lastPositionSeconds: 180,
          durationSeconds: 600,
          clientEventAt: "2026-07-01T00:02:00.000Z",
          source: "player",
        },
      ],
    },
  );

  assert.equal(savedPosition, 180);
  assert.equal(aggregateRead, false);
  assert.deepEqual(result.programmeIds, []);
  assert.equal(result.syncedItems, 1);
});

test("trace IDs accept bounded safe values and reject injection-shaped input", () => {
  assert.equal(normalizeTraceId(" request-123:child "), "request-123:child");
  assert.equal(normalizeTraceId("bad\nforged-log"), null);
  assert.equal(normalizeTraceId("x".repeat(129)), null);
  assert.equal(normalizeTraceId(["request-1"]), null);
});

test("HTTP logging strips query strings and records completed requests", () => {
  assert.equal(
    safeHttpPath("/api/auth/google/callback?code=secret&state=private"),
    "/api/auth/google/callback",
  );

  const logs: string[] = [];
  const listeners: Partial<Record<"finish" | "close", () => void>> = {};
  const middleware = new RequestIdMiddleware();
  (
    middleware as unknown as {
      logger: { log(value: string): void; warn(value: string): void };
    }
  ).logger = {
    log: (value) => logs.push(value),
    warn: (value) => logs.push(value),
  };
  const request: RequestWithContext = {
    headers: { "x-request-id": "request-1" },
    method: "GET",
    originalUrl: "/api/auth/google/callback?code=secret&state=private",
  };

  middleware.use(
    request,
    {
      statusCode: 200,
      setHeader: () => undefined,
      once: (event, listener) => {
        listeners[event] = listener;
      },
    },
    () => undefined,
  );
  request.user = { role: UserRole.admin } as never;
  listeners.finish?.();

  assert.equal(logs.length, 2);
  assert.match(logs[0] ?? "", /http\.request\.received/);
  assert.match(logs[1] ?? "", /http\.request\.completed/);
  assert.match(logs[1] ?? "", /"authenticated":true/);
  assert.doesNotMatch(logs.join("\n"), /secret|private|\?/);
});

test("integration logging keeps correlation context and redacts provider errors", async () => {
  const requestContext = new RequestContextService();
  const integration = new IntegrationLoggerService(requestContext);
  const logs: string[] = [];
  (
    integration as unknown as {
      logger: { log(value: string): void; warn(value: string): void };
    }
  ).logger = {
    log: (value) => logs.push(value),
    warn: (value) => logs.push(value),
  };

  await assert.rejects(
    requestContext.run(
      {
        requestId: "request-2",
        correlationId: "correlation-2",
        actorUserId: null,
        ipAddress: null,
        userAgent: null,
      },
      () =>
        integration.trackOutbound(
          { provider: "google_calendar", operation: "free_busy.query" },
          async () => {
            throw new Error("provider-token=secret-value");
          },
        ),
    ),
    /secret-value/,
  );

  assert.equal(logs.length, 2);
  assert.match(logs.join("\n"), /request-2/);
  assert.match(logs.join("\n"), /correlation-2/);
  assert.match(logs.join("\n"), /integration\.outbound\.failed/);
  assert.doesNotMatch(logs.join("\n"), /secret-value|provider-token/);
});

test("request middleware replaces an unsafe inbound ID and echoes the generated ID", () => {
  const headers: Record<string, string> = {};
  const request: RequestWithContext = {
    headers: { "x-request-id": "bad\nheader" },
  };
  let nextCalled = false;
  new RequestIdMiddleware().use(
    request,
    { setHeader: (name, value) => (headers[name] = value) },
    () => {
      nextCalled = true;
    },
  );

  assert.match(request.requestId ?? "", /^[0-9a-f-]{36}$/);
  assert.equal(headers["x-request-id"], request.requestId);
  assert.equal(nextCalled, true);
});

test("global 5xx logging includes trace context without logging exception messages", () => {
  const logs: string[] = [];
  let responseStatus = 0;
  let responseBody: unknown;
  const filter = new ApiExceptionFilter();
  (filter as unknown as { logger: { error(value: string): void } }).logger = {
    error: (value) => logs.push(value),
  };
  const response = {
    status(code: number) {
      responseStatus = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
    },
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        method: "POST",
        originalUrl: "/api/example",
        requestId: "request-1",
        correlationId: "correlation-1",
      }),
      getResponse: () => response,
    }),
  };

  filter.catch(new Error("do-not-log-token=secret-value"), host as never);

  assert.equal(responseStatus, 500);
  assert.equal(logs.length, 1);
  assert.match(logs[0] ?? "", /request-1/);
  assert.match(logs[0] ?? "", /correlation-1/);
  assert.doesNotMatch(logs[0] ?? "", /secret-value/);
  assert.equal(
    (responseBody as { error: { message: string } }).error.message,
    "Something went wrong. Please try again.",
  );
});

test("expected HTTP errors are logged without request values", () => {
  const logs: string[] = [];
  const filter = new ApiExceptionFilter();
  (
    filter as unknown as {
      logger: { error(value: string): void; warn(value: string): void };
    }
  ).logger = {
    error: (value) => logs.push(value),
    warn: (value) => logs.push(value),
  };
  const response = {
    status() {
      return this;
    },
    json() {},
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        method: "POST",
        originalUrl: "/api/login?email=private.com",
        requestId: "request-4xx",
      }),
      getResponse: () => response,
    }),
  };

  filter.catch(
    new BadRequestException("private validation value"),
    host as never,
  );

  assert.equal(logs.length, 1);
  assert.match(logs[0] ?? "", /http\.request\.failed/);
  assert.match(logs[0] ?? "", /"status":400/);
  assert.doesNotMatch(logs[0] ?? "", /private|example\.com|\?/);
});

test("operational health reports required failures without exposing error details", async () => {
  const config: Record<string, string> = {
    MUX_TOKEN_ID: "set",
    MUX_TOKEN_SECRET: "set",
    MUX_WEBHOOK_SECRET: "set",
    MUX_SIGNING_KEY_ID: "set",
    MUX_SIGNING_PRIVATE_KEY: "set",
  };
  const health = new OperationalHealthService(
    { $queryRaw: async () => [{ ok: 1 }] } as never,
    { status: async () => ({ status: "connected" }) } as never,
    {
      healthCheck: async () => {
        throw new Error("storage-secret-should-not-escape");
      },
    } as never,
    {
      healthCheck: async () => ({
        transport: "smtp",
        status: "connected",
      }),
    } as never,
    { get: (key: string) => config[key] } as never,
  );

  const result = await health.status();

  assert.equal(result.status, "unhealthy");
  assert.deepEqual(result.failed, ["objectStorage"]);
  assert.deepEqual(result.dependencies.objectStorage, {
    status: "unavailable",
    latencyMs: result.dependencies.objectStorage.latencyMs,
  });
  assert.equal(result.integrations.calendar.status, "not_configured");
  assert.equal(result.integrations.video.status, "configured");
  assert.doesNotMatch(JSON.stringify(result), /storage-secret/);
});

test("report export creation writes through lifecycle audit before enqueueing", async () => {
  const createdAt = new Date("2026-07-16T00:00:00.000Z");
  const report = {
    id: "export-1",
    format: ReportExportFormat.csv,
    status: ReportExportStatus.queued,
    programmeId: null,
    programme: null,
    dateFrom: new Date("2026-01-01T00:00:00.000Z"),
    dateTo: new Date("2026-12-31T23:59:59.999Z"),
    fileAssetId: null,
    failureReason: null,
    createdAt,
    completedAt: null,
    expiresAt: null,
  };
  let definition: { action?: string; entityType?: string } | undefined;
  let createArgs: unknown;
  let queued: unknown;
  const audit = {
    capture: async (
      nextDefinition: { action?: string; entityType?: string },
      mutation: (tx: unknown) => Promise<unknown>,
    ) => {
      definition = nextDefinition;
      return mutation({
        reportExport: {
          create: async (args: unknown) => {
            createArgs = args;
            return report;
          },
        },
      });
    },
  };
  const service = new ReportExportService(
    {} as never,
    audit as never,
    {
      resolvePeriod: () => ({
        from: report.dateFrom,
        to: report.dateTo,
      }),
    } as never,
    {} as never,
    {} as never,
    {
      add: async (...args: unknown[]) => {
        queued = args;
        return {};
      },
    } as never,
  );

  const result = await service.create({ id: "admin-1" } as never, {
    format: ReportExportFormat.csv,
  });

  assert.deepEqual(definition, {
    action: "reports.export.requested",
    entityType: "reportExport",
    entityId: (definition as never as { entityId: unknown }).entityId,
    summary: "Requested reporting export",
    payload: {
      format: "csv",
      programmeId: null,
      dateFrom: "2026-01-01T00:00:00.000Z",
      dateTo: "2026-12-31T23:59:59.999Z",
    },
  });
  assert.ok(createArgs);
  assert.deepEqual(queued, [
    "generate-report-export",
    { reportExportId: "export-1" },
    {
      jobId: "report-export-export-1",
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
    },
  ]);
  assert.equal(result.id, "export-1");
});

test("deliverable calendar windows preserve entrepreneur scope and reject reversed ranges", async () => {
  let freshnessChecks = 0;
  const service = new DeliverablesService(
    {} as never,
    {} as never,
    {} as never,
    {
      ensureCurrent: async () => {
        freshnessChecks += 1;
      },
    } as never,
    {} as never,
  );
  const buildInstanceWhere = (
    service as unknown as {
      buildInstanceWhere(
        user: { id: string; role: UserRole },
        query: { dateFrom?: string; dateTo?: string },
      ): unknown;
    }
  ).buildInstanceWhere.bind(service);
  const dateFrom = "2026-07-01T00:00:00.000Z";
  const dateTo = "2026-08-11T23:59:59.999Z";

  const entrepreneurWhere = buildInstanceWhere(
    { id: "entrepreneur-1", role: UserRole.entrepreneur },
    { dateFrom, dateTo },
  ) as {
    AND: Array<{
      entrepreneurUserId?: string;
      programme?: {
        archivedAt: null;
        publishedAt: { not: null };
        startDate: { lte: Date };
      };
      dueDate?: { gte: Date; lte: Date };
    }>;
  };
  assert.equal(entrepreneurWhere.AND[0]?.entrepreneurUserId, "entrepreneur-1");
  assert.equal(entrepreneurWhere.AND[0]?.programme?.archivedAt, null);
  assert.deepEqual(entrepreneurWhere.AND[0]?.programme?.publishedAt, {
    not: null,
  });
  assert.ok(
    entrepreneurWhere.AND[0]?.programme?.startDate.lte instanceof Date,
  );
  assert.deepEqual(entrepreneurWhere.AND[1]?.dueDate, {
    gte: new Date(dateFrom),
    lte: new Date(dateTo),
  });
  await assert.rejects(
    service.listInstances(
      { id: "entrepreneur-1", role: UserRole.entrepreneur } as never,
      { dateFrom: dateTo, dateTo: dateFrom },
    ),
    /date range is invalid/i,
  );
  assert.equal(freshnessChecks, 1);
});

test("draft tools require a resource but not a publish-ready audience", async () => {
  const service = new ToolsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const validate = (
    service as unknown as {
      validateToolPayload(
        effective: Record<string, unknown>,
        changed: Record<string, unknown>,
      ): Promise<void>;
    }
  ).validateToolPayload.bind(service);

  await assert.rejects(
    validate(
      {
        type: EntrepreneurToolType.embedded_tool,
        status: EntrepreneurToolStatus.draft,
        visibility: EntrepreneurToolVisibility.programmes,
        embeddedUrl: null,
        programmeIds: [],
      },
      { status: EntrepreneurToolStatus.draft },
    ),
    /require a resource link/i,
  );

  await assert.rejects(
    validate(
      {
        type: EntrepreneurToolType.pdf,
        status: EntrepreneurToolStatus.draft,
        visibility: EntrepreneurToolVisibility.all_entrepreneurs,
        fileAssetId: null,
      },
      { status: EntrepreneurToolStatus.draft },
    ),
    /require an uploaded file/i,
  );

  await validate(
    {
      type: EntrepreneurToolType.embedded_tool,
      status: EntrepreneurToolStatus.draft,
      visibility: EntrepreneurToolVisibility.programmes,
      embeddedUrl: "https://example.com/tool",
      programmeIds: [],
    },
    { status: EntrepreneurToolStatus.draft },
  );

  await assert.rejects(
    validate(
      {
        type: EntrepreneurToolType.embedded_tool,
        status: EntrepreneurToolStatus.published,
        visibility: EntrepreneurToolVisibility.programmes,
        embeddedUrl: "https://example.com/tool",
        programmeIds: [],
      },
      { status: EntrepreneurToolStatus.published },
    ),
    /Select at least one programme before publishing/,
  );
});

test("status-only tool updates retain the persisted audience for validation", async () => {
  let effectivePayload: Record<string, unknown> | undefined;
  let changedPayload: Record<string, unknown> | undefined;
  const existing = {
    id: "tool-1",
    name: "Growth planner",
    description: "A programme planning tool.",
    type: EntrepreneurToolType.embedded_tool,
    toolAreaId: "area-1",
    iconKey: "document",
    visibility: EntrepreneurToolVisibility.programmes,
    status: EntrepreneurToolStatus.published,
    embeddedUrl: "https://example.com/tool",
    fileAssetId: null,
    programmeAccess: [{ programmeId: "programme-1" }],
    entrepreneurAccess: [],
    hiddenEntrepreneurs: [{ entrepreneurUserId: "entrepreneur-2" }],
  };
  const service = new ToolsService(
    { tool: { findUnique: async () => existing } } as never,
    {} as never,
    {
      capture: async () => {
        throw new Error("validation-complete");
      },
    } as never,
    {} as never,
  );
  (
    service as unknown as {
      validateToolPayload(
        effective: Record<string, unknown>,
        changed: Record<string, unknown>,
      ): Promise<void>;
    }
  ).validateToolPayload = async (effective, changed) => {
    effectivePayload = effective;
    changedPayload = changed;
  };

  await assert.rejects(
    service.updateTool(
      { id: "admin-1", role: UserRole.admin } as never,
      "tool-1",
      { status: EntrepreneurToolStatus.draft },
    ),
    /validation-complete/,
  );
  assert.deepEqual(effectivePayload?.programmeIds, ["programme-1"]);
  assert.deepEqual(effectivePayload?.hiddenEntrepreneurUserIds, [
    "entrepreneur-2",
  ]);
  assert.deepEqual(changedPayload, { status: EntrepreneurToolStatus.draft });
});
