import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeliverableLifecycleModule } from './deliverable-lifecycle.module';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    DatabaseModule,
    FilesModule,
    NotificationsModule,
    DeliverableLifecycleModule,
  ],
  controllers: [DeliverablesController],
  providers: [DeliverablesService],
})
export class DeliverablesModule {}
