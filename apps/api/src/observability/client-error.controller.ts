import { Body, Controller, Logger, Post } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";
import { RequestContextService } from "../common/request-context/request-context.service";
import { ReportClientErrorDto } from "./dto/report-client-error.dto";

@Controller("observability")
export class ClientErrorController {
  private readonly logger = new Logger("ClientError");

  constructor(private readonly context: RequestContextService) {}

  @Post("client-errors")
  @Public()
  report(@Body() error: ReportClientErrorDto) {
    const request = this.context.get();
    this.logger.error(
      JSON.stringify({
        event: "client.render.failed",
        name: error.name,
        message: error.message,
        path: error.path,
        boundary: error.boundary,
        ...(error.digest ? { digest: error.digest } : {}),
        requestId: request?.requestId ?? "unknown",
        correlationId:
          request?.correlationId ?? request?.requestId ?? "unknown",
      }),
    );
    return { accepted: true };
  }
}
