import { Injectable, Logger } from "@nestjs/common";
import { RequestContextService } from "../request-context/request-context.service";

export type IntegrationRequestDetails = {
  provider: string;
  operation: string;
  method?: string;
  externalEventId?: string;
};

@Injectable()
export class IntegrationLoggerService {
  private readonly logger = new Logger("Integration");

  constructor(private readonly context: RequestContextService) {}

  trackOutbound<T>(
    details: IntegrationRequestDetails,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.track("outbound", details, operation);
  }

  trackWebhook<T>(
    details: IntegrationRequestDetails,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.track("webhook", details, operation);
  }

  private async track<T>(
    direction: "outbound" | "webhook",
    details: IntegrationRequestDetails,
    operation: () => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();
    this.write(
      "log",
      direction === "outbound"
        ? "integration.outbound.started"
        : "integration.webhook.received",
      details,
    );

    try {
      const result = await operation();
      this.write(
        "log",
        direction === "outbound"
          ? "integration.outbound.completed"
          : "integration.webhook.processed",
        details,
        { durationMs: Date.now() - startedAt },
      );
      return result;
    } catch (error) {
      this.write(
        "warn",
        direction === "outbound"
          ? "integration.outbound.failed"
          : "integration.webhook.failed",
        details,
        {
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.name : "UnknownError",
        },
      );
      throw error;
    }
  }

  private write(
    level: "log" | "warn",
    event: string,
    details: IntegrationRequestDetails,
    extra: Record<string, unknown> = {},
  ) {
    const context = this.context.get();
    this.logger[level](
      JSON.stringify({
        event,
        provider: details.provider,
        operation: details.operation,
        ...(details.method ? { method: details.method } : {}),
        ...(details.externalEventId
          ? { externalEventId: details.externalEventId }
          : {}),
        requestId: context?.requestId ?? "background",
        correlationId:
          context?.correlationId ?? context?.requestId ?? "background",
        ...extra,
      }),
    );
  }
}
