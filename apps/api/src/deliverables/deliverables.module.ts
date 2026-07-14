import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FilesModule } from '../files/files.module';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';

@Module({
  imports: [DatabaseModule, FilesModule],
  controllers: [DeliverablesController],
  providers: [DeliverablesService],
})
export class DeliverablesModule {}
