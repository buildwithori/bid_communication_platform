import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DeliverableLifecycleModule } from '../deliverables/deliverable-lifecycle.module';
import {
  EntrepreneurInvitationsController,
  EntrepreneursController,
} from './entrepreneurs.controller';
import { EntrepreneurManagementService } from './entrepreneur-management.service';
import { EntrepreneursEmailService } from './entrepreneurs-email.service';
import { EntrepreneursService } from './entrepreneurs.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule, DeliverableLifecycleModule],
  controllers: [EntrepreneursController, EntrepreneurInvitationsController],
  providers: [
    EntrepreneursService,
    EntrepreneurManagementService,
    EntrepreneursEmailService,
  ],
  exports: [EntrepreneursService],
})
export class EntrepreneursModule {}
