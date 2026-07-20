import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { ResourceDeletionService } from "./resource-deletion.service";

@Module({
  imports: [AuditModule, DatabaseModule],
  providers: [ResourceDeletionService],
  exports: [ResourceDeletionService],
})
export class ResourceDeletionModule {}
