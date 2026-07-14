import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageService } from './storage.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FilesController],
  providers: [FilesService, StorageService],
  exports: [FilesService, StorageService],
})
export class FilesModule {}
