import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { FilesModule } from '../files/files.module';
import { LearningModule } from '../learning/learning.module';
import { ResourceDeletionModule } from '../resource-deletion/resource-deletion.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule, FilesModule, LearningModule, ResourceDeletionModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
