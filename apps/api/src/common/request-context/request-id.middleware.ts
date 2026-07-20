import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { RequestWithContext } from "./request-context.types";
import { normalizeTraceId } from "./trace-id";

type ResponseLike = {
  statusCode?: number;
  setHeader(name: string, value: string): void;
  once?(event: "finish" | "close", listener: () => void): void;
};

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HttpAccess");

  use(request: RequestWithContext, response: ResponseLike, next: () => void) {
    const incoming = request.headers["x-request-id"];
    const requestId = normalizeTraceId(incoming) ?? randomUUID();
    const correlationId =
      normalizeTraceId(request.headers["x-correlation-id"]) ?? requestId;
    const method = request.method ?? "UNKNOWN";
    const path = safeHttpPath(request.originalUrl ?? request.url);
    const startedAt = Date.now();
    request.requestId = requestId;
    request.correlationId = correlationId;
    response.setHeader("x-request-id", requestId);
    response.setHeader("x-correlation-id", correlationId);

    if (shouldLogHttpPath(path)) {
      this.logger.log(
        JSON.stringify({
          event: "http.request.received",
          method,
          path,
          requestId,
          correlationId,
        }),
      );

      let completed = false;
      response.once?.("finish", () => {
        completed = true;
        this.logger.log(
          JSON.stringify({
            event: "http.request.completed",
            method,
            path,
            status: response.statusCode ?? 0,
            durationMs: Date.now() - startedAt,
            requestId,
            correlationId: request.correlationId ?? correlationId,
            authenticated: Boolean(request.user),
            ...(request.user?.role ? { role: request.user.role } : {}),
          }),
        );
      });
      response.once?.("close", () => {
        if (completed) return;
        this.logger.warn(
          JSON.stringify({
            event: "http.request.aborted",
            method,
            path,
            status: response.statusCode ?? 0,
            durationMs: Date.now() - startedAt,
            requestId,
            correlationId: request.correlationId ?? correlationId,
          }),
        );
      });
    }

    next();
  }
}

export function safeHttpPath(value: string | undefined) {
  if (!value) return "unknown";
  return value.split(/[?#]/, 1)[0] || "/";
}

function shouldLogHttpPath(path: string) {
  return path !== "/health" && path !== "/api/health";
}
