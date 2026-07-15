import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuditService } from "./audit.service";

@Injectable()
export class AuditWorkerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AuditWorkerService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    const intervalMs = this.config.getOrThrow<number>(
      "AUDIT_PROCESS_INTERVAL_MS",
    );
    this.timer = setInterval(() => void this.process(), intervalMs);
    this.timer.unref();
    void this.process();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;
    try {
      const result = await this.audit.processPending();
      if (result.processed > 0) {
        this.logger.log(`Processed ${result.processed} audit event(s)`);
      }
    } catch (error: unknown) {
      this.logger.error(
        "Audit outbox processing failed",
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.processing = false;
    }
  }
}
