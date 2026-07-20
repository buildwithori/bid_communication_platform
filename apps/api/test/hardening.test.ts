import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  ReportExportFormat,
  ReportExportStatus,
  UserRole,
} from "@prisma/client";
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

  assert.deepEqual(
    buildInstanceWhere(
      { id: "entrepreneur-1", role: UserRole.entrepreneur },
      { dateFrom, dateTo },
    ),
    {
      AND: [
        { entrepreneurUserId: "entrepreneur-1" },
        {
          dueDate: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo),
          },
        },
      ],
    },
  );
  await assert.rejects(
    service.listInstances(
      { id: "entrepreneur-1", role: UserRole.entrepreneur } as never,
      { dateFrom: dateTo, dateTo: dateFrom },
    ),
    /date range is invalid/i,
  );
  assert.equal(freshnessChecks, 1);
});
