import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { RequestContextService } from "./request-context.service";
import { RequestWithContext } from "./request-context.types";
import { normalizeTraceId } from "./trace-id";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly context: RequestContextService) {}

  intercept(
    executionContext: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = executionContext
      .switchToHttp()
      .getRequest<RequestWithContext>();
    const response = executionContext.switchToHttp().getResponse<{
      setHeader(name: string, value: string): void;
    }>();
    const userAgent = request.headers["user-agent"];
    const correlationHeader = request.headers["x-correlation-id"];
    const requestId = request.requestId ?? "unknown";
    const correlationId = normalizeTraceId(correlationHeader) ?? requestId;
    request.correlationId = correlationId;
    response.setHeader("x-correlation-id", correlationId);

    return new Observable((subscriber) =>
      this.context.run(
        {
          requestId,
          correlationId,
          actorUserId: request.user?.id ?? null,
          ipAddress: request.ip ?? null,
          userAgent: typeof userAgent === "string" ? userAgent : null,
        },
        () => next.handle().subscribe(subscriber),
      ),
    );
  }
}
