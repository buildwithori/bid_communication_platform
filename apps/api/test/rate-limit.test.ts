import assert from "node:assert/strict";
import test from "node:test";
import { ExecutionContext, HttpException } from "@nestjs/common";
import { RedisRateLimitGuard } from "../src/common/guards/redis-rate-limit.guard";

type RequestShape = {
  body?: Record<string, unknown>;
  ip?: string;
  method: string;
  originalUrl: string;
  user?: { id: string };
};

const contextFor = (
  request: RequestShape,
  headers: Record<string, string | number> = {},
) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({
        setHeader: (name: string, value: string | number) => {
          headers[name] = value;
        },
      }),
    }),
  }) as ExecutionContext;

const guardWith = (
  evalImplementation: (...args: unknown[]) => Promise<[number, number]>,
) =>
  new RedisRateLimitGuard({
    client: Promise.resolve({ eval: evalImplementation }),
  } as never);

test("ordinary application routes do not consume a rate-limit bucket", async () => {
  let calls = 0;
  const guard = guardWith(async () => {
    calls += 1;
    return [1, 60_000];
  });
  const allowed = await guard.canActivate(
    contextFor({
      ip: "203.0.113.10",
      method: "GET",
      originalUrl: "/api/programmes?take=20",
    }),
  );
  assert.equal(allowed, true);
  assert.equal(calls, 0);
});

test("login is limited by both IP and normalized account without leaking identities", async () => {
  const calls: unknown[][] = [];
  const headers: Record<string, string | number> = {};
  const guard = guardWith(async (...args) => {
    calls.push(args);
    return [1, 900_000];
  });
  await guard.canActivate(
    contextFor(
      {
        body: { email: " Admin@BID.org " },
        ip: "203.0.113.10",
        method: "POST",
        originalUrl: "/api/auth/login?source=web",
      },
      headers,
    ),
  );
  assert.equal(calls.length, 2);
  const serialized = JSON.stringify(calls);
  assert.doesNotMatch(serialized, /203\.0\.113\.10/);
  assert.doesNotMatch(serialized, /admin@bid\.org/i);
  assert.match(
    String(calls[0]?.[2]),
    /^bid-hub:rate-limit:auth-login-ip:[a-f0-9]{64}$/,
  );
  assert.match(
    String(calls[1]?.[2]),
    /^bid-hub:rate-limit:auth-login-account:[a-f0-9]{64}$/,
  );
  assert.equal(headers["x-ratelimit-limit"], 10);
  assert.equal(headers["x-ratelimit-remaining"], 9);
  assert.equal(headers["retry-after"], undefined);
});

test("an exhausted account bucket returns 429 with Retry-After", async () => {
  let call = 0;
  const headers: Record<string, string | number> = {};
  const guard = guardWith(async () => {
    call += 1;
    return call === 1 ? [3, 120_000] : [11, 89_001];
  });
  await assert.rejects(
    guard.canActivate(
      contextFor(
        {
          body: { email: "admin@bid.org" },
          ip: "203.0.113.10",
          method: "POST",
          originalUrl: "/api/auth/login",
        },
        headers,
      ),
    ),
    (error: unknown) =>
      error instanceof HttpException && error.getStatus() === 429,
  );
  assert.equal(headers["x-ratelimit-remaining"], 0);
  assert.equal(headers["retry-after"], 90);
});

test("missing account input remains available to DTO validation", async () => {
  let calls = 0;
  const guard = guardWith(async () => {
    calls += 1;
    return [1, 900_000];
  });
  const allowed = await guard.canActivate(
    contextFor({
      body: {},
      ip: "203.0.113.10",
      method: "POST",
      originalUrl: "/api/auth/login",
    }),
  );
  assert.equal(allowed, true);
  assert.equal(calls, 1);
});

test("client render error reports are rate limited by IP", async () => {
  const calls: unknown[][] = [];
  const headers: Record<string, string | number> = {};
  const guard = guardWith(async (...args) => {
    calls.push(args);
    return [1, 60_000];
  });

  await guard.canActivate(
    contextFor(
      {
        ip: "203.0.113.20",
        method: "POST",
        originalUrl: "/api/observability/client-errors",
      },
      headers,
    ),
  );

  assert.equal(calls.length, 1);
  assert.match(
    String(calls[0]?.[2]),
    /^bid-hub:rate-limit:client-error-report:[a-f0-9]{64}$/,
  );
  assert.equal(headers["x-ratelimit-limit"], 30);
});

test("protected routes fail closed when Redis is unavailable", async () => {
  const guard = guardWith(async () => {
    throw new Error("redis connection secret");
  });
  await assert.rejects(
    guard.canActivate(
      contextFor({
        ip: "203.0.113.10",
        method: "GET",
        originalUrl: "/api/health",
      }),
    ),
    (error: unknown) =>
      error instanceof HttpException &&
      error.getStatus() === 503 &&
      !error.message.includes("secret"),
  );
});
