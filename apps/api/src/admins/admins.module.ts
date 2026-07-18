import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import {
  AdminInvitationsController,
  AdminsController,
} from "./admins.controller";
import { AdminsEmailService } from "./admins-email.service";
import { AdminsService } from "./admins.service";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [AdminsController, AdminInvitationsController],
  providers: [AdminsService, AdminsEmailService],
  exports: [AdminsService],
})
export class AdminsModule {}
