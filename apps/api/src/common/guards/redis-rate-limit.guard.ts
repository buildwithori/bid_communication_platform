import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { createHash } from "node:crypto";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../../jobs/jobs.constants";

type RateLimitRequest = {
  body?: Record<string, unknown>;
  ip?: string;
  method?: string;
  originalUrl?: string;
  url?: string;
  user?: { id?: string };
};
type RateLimitResponse = {
  setHeader(name: string, value: string | number): void;
};
type RedisRateLimitClient = {
  eval(
    script: string,
    numberOfKeys: number,
    key: string,
    windowMs: number,
  ): Promise<[number, number]>;
};
type RateLimitPolicy = {
  id: string;
  limit: number;
  windowMs: number;
  matches(method: string, path: string): boolean;
  identity(request: RateLimitRequest): string | undefined;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const pathPolicy = (
  id: string,
  method: string,
  path: RegExp,
  limit: number,
  windowMs: number,
  identity: RateLimitPolicy["identity"],
): RateLimitPolicy => ({
  id,
  limit,
  windowMs,
  identity,
  matches: (requestMethod, requestPath) =>
    requestMethod === method && path.test(requestPath),
});
const ipIdentity = (request: RateLimitRequest) => request.ip ?? "unknown";
const userIdentity = (request: RateLimitRequest) => request.user?.id;
const bodyIdentity = (field: string) => (request: RateLimitRequest) => {
  const value = request.body?.[field];
  return typeof value === "string" && value.trim()
    ? value.trim().toLowerCase()
    : undefined;
};

const POLICIES: RateLimitPolicy[] = [
  pathPolicy(
    "auth-login-ip",
    "POST",
    /^\/auth\/login$/,
    30,
    15 * MINUTE,
    ipIdentity,
  ),
  pathPolicy(
    "auth-login-account",
    "POST",
    /^\/auth\/login$/,
    10,
    15 * MINUTE,
    bodyIdentity("email"),
  ),
  pathPolicy(
    "auth-signup-ip",
    "POST",
    /^\/auth\/signup$/,
    10,
    HOUR,
    ipIdentity,
  ),
  pathPolicy(
    "auth-signup-account",
    "POST",
    /^\/auth\/signup$/,
    5,
    HOUR,
    bodyIdentity("email"),
  ),
  pathPolicy(
    "auth-forgot-ip",
    "POST",
    /^\/auth\/forgot-password$/,
    15,
    HOUR,
    ipIdentity,
  ),
  pathPolicy(
    "auth-forgot-account",
    "POST",
    /^\/auth\/forgot-password$/,
    5,
    HOUR,
    bodyIdentity("email"),
  ),
  pathPolicy(
    "auth-reset-ip",
    "POST",
    /^\/auth\/reset-password$/,
    15,
    HOUR,
    ipIdentity,
  ),
  pathPolicy(
    "auth-reset-token",
    "POST",
    /^\/auth\/reset-password$/,
    5,
    HOUR,
    bodyIdentity("token"),
  ),
  pathPolicy(
    "auth-verify-ip",
    "POST",
    /^\/auth\/verify-email$/,
    20,
    HOUR,
    ipIdentity,
  ),
  pathPolicy(
    "auth-verify-token",
    "POST",
    /^\/auth\/verify-email$/,
    5,
    HOUR,
    bodyIdentity("token"),
  ),
  pathPolicy(
    "auth-resend-ip",
    "POST",
    /^\/auth\/resend-verification$/,
    15,
    HOUR,
    ipIdentity,
  ),
  pathPolicy(
    "auth-resend-account",
    "POST",
    /^\/auth\/resend-verification$/,
    5,
    HOUR,
    bodyIdentity("email"),
  ),
  pathPolicy(
    "auth-google-start",
    "GET",
    /^\/auth\/google\/start$/,
    30,
    15 * MINUTE,
    ipIdentity,
  ),
  pathPolicy(
    "auth-google-callback",
    "GET",
    /^\/auth\/google\/callback$/,
    60,
    15 * MINUTE,
    ipIdentity,
  ),
  pathPolicy(
    "auth-refresh",
    "POST",
    /^\/auth\/refresh$/,
    60,
    15 * MINUTE,
    ipIdentity,
  ),
  pathPolicy(
    "file-upload-create",
    "POST",
    /^\/files\/direct-upload-url$/,
    60,
    15 * MINUTE,
    userIdentity,
  ),
  pathPolicy(
    "file-upload-complete",
    "POST",
    /^\/files\/[^/]+\/complete$/,
    120,
    15 * MINUTE,
    userIdentity,
  ),
  pathPolicy(
    "video-upload-create",
    "POST",
    /^\/videos\/direct-uploads$/,
    30,
    HOUR,
    userIdentity,
  ),
  pathPolicy(
    "report-export-create",
    "POST",
    /^\/reporting\/exports$/,
    10,
    15 * MINUTE,
    userIdentity,
  ),
  pathPolicy(
    "report-reminder-send",
    "POST",
    /^\/reporting\/overdue-updates\/[^/]+\/reminder$/,
    30,
    15 * MINUTE,
    userIdentity,
  ),
  pathPolicy(
    "mux-webhook",
    "POST",
    /^\/webhooks\/mux$/,
    600,
    MINUTE,
    ipIdentity,
  ),
  pathPolicy(
    "google-calendar-webhook",
    "POST",
    /^\/webhooks\/google-calendar$/,
    600,
    MINUTE,
    ipIdentity,
  ),
  pathPolicy("health", "GET", /^\/health$/, 120, MINUTE, ipIdentity),
];

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}
`;

@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  constructor(@InjectQueue(QUEUE_NAMES.audit) private readonly queue: Queue) {}

  async canActivate(context: ExecutionContext) {
    const http = context.switchToHttp();
    const request = http.getRequest<RateLimitRequest>();
    const response = http.getResponse<RateLimitResponse>();
    const method = (request.method ?? "GET").toUpperCase();
    const path = this.normalizedPath(request.originalUrl ?? request.url ?? "/");
    const policies = POLICIES.filter((policy) => policy.matches(method, path));
    for (const policy of policies) {
      const identity = policy.identity(request);
      if (!identity) {
        continue;
      }
      const result = await this.consume(policy, identity);
      this.setHeaders(response, policy.limit, result.count);
      if (result.count > policy.limit) {
        response.setHeader(
          "retry-after",
          Math.max(Math.ceil(result.ttlMs / 1_000), 1),
        );
        throw new HttpException(
          "Too many requests. Try again later.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    return true;
  }

  private async consume(policy: RateLimitPolicy, identity: string) {
    try {
      const redis = (await this.queue
        .client) as unknown as RedisRateLimitClient;
      const key = `bid-hub:rate-limit:${policy.id}:${this.hash(identity)}`;
      const [count, ttlMs] = await redis.eval(
        RATE_LIMIT_SCRIPT,
        1,
        key,
        policy.windowMs,
      );
      return { count: Number(count), ttlMs: Math.max(Number(ttlMs), 0) };
    } catch {
      throw new ServiceUnavailableException(
        "Request protection is temporarily unavailable.",
      );
    }
  }

  private normalizedPath(url: string) {
    const path = url.split("?", 1)[0] || "/";
    return path.replace(/^\/api(?=\/)/, "");
  }

  private hash(identity: string) {
    return createHash("sha256").update(identity).digest("hex");
  }

  private setHeaders(
    response: RateLimitResponse,
    limit: number,
    count: number,
  ) {
    response.setHeader("x-ratelimit-limit", limit);
    response.setHeader("x-ratelimit-remaining", Math.max(limit - count, 0));
  }
}
