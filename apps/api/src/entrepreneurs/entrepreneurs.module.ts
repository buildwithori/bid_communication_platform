import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import {
  EntrepreneurInvitationsController,
  EntrepreneursController,
} from './entrepreneurs.controller';
import { EntrepreneurManagementService } from './entrepreneur-management.service';
import { EntrepreneursEmailService } from './entrepreneurs-email.service';
import { EntrepreneursService } from './entrepreneurs.service';

@Module({
  imports: [AuthModule, DatabaseModule, EmailModule, AuditModule],
  controllers: [EntrepreneursController, EntrepreneurInvitationsController],
  providers: [
    EntrepreneursService,
    EntrepreneurManagementService,
    EntrepreneursEmailService,
  ],
  exports: [EntrepreneursService],
})
export class EntrepreneursModule {}
