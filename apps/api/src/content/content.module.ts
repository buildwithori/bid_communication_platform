import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { FilesModule } from '../files/files.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [AuthModule, DatabaseModule, FilesModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
