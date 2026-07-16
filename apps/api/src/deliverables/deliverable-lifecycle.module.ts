import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DeliverableLifecycleService } from './deliverable-lifecycle.service';

@Module({
  imports: [DatabaseModule],
  providers: [DeliverableLifecycleService],
  exports: [DeliverableLifecycleService],
})
export class DeliverableLifecycleModule {}
