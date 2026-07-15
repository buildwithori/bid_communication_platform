import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuditService } from "./audit.service";
import { AuditWorkerService } from "./audit-worker.service";

@Module({
  imports: [DatabaseModule],
  providers: [AuditService, AuditWorkerService],
  exports: [AuditService],
})
export class AuditModule {}
