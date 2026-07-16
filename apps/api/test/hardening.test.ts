import assert from "node:assert/strict";
import test from "node:test";
import { ReportExportFormat, ReportExportStatus } from "@prisma/client";
import { ApiExceptionFilter } from "../src/common/filters/api-exception.filter";
import type { RequestWithContext } from "../src/common/request-context/request-context.types";
import { RequestIdMiddleware } from "../src/common/request-context/request-id.middleware";
import { normalizeTraceId } from "../src/common/request-context/trace-id";
import { OperationalHealthService } from "../src/health/operational-health.service";
import { ReportExportService } from "../src/reporting/report-export.service";

test("trace IDs accept bounded safe values and reject injection-shaped input", () => {
  assert.equal(normalizeTraceId(" request-123:child "), "request-123:child");
  assert.equal(normalizeTraceId("bad\nforged-log"), null);
  assert.equal(normalizeTraceId("x".repeat(129)), null);
  assert.equal(normalizeTraceId(["request-1"]), null);
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
