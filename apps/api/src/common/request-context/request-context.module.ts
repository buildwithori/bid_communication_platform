import { Global, Module } from "@nestjs/common";
import { RequestContextService } from "./request-context.service";
import { RequestIdMiddleware } from "./request-id.middleware";
import { IntegrationLoggerService } from "../observability/integration-logger.service";

@Global()
@Module({
  providers: [
    RequestContextService,
    RequestIdMiddleware,
    IntegrationLoggerService,
  ],
  exports: [
    RequestContextService,
    RequestIdMiddleware,
    IntegrationLoggerService,
  ],
})
export class RequestContextModule {}
