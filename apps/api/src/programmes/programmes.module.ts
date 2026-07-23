import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DeliverableLifecycleModule } from '../deliverables/deliverable-lifecycle.module';
import { ResourceDeletionModule } from '../resource-deletion/resource-deletion.module';
import { LearningModule } from '../learning/learning.module';
import { ProgrammesController } from './programmes.controller';
import { ProgrammesService } from './programmes.service';

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule, DeliverableLifecycleModule, LearningModule, ResourceDeletionModule],
  controllers: [ProgrammesController],
  providers: [ProgrammesService],
})
export class ProgrammesModule {}
