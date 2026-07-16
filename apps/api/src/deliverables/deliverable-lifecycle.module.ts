import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DeliverableLifecycleService } from './deliverable-lifecycle.service';
import { RecurringDeliverableService } from './recurring-deliverable.service';

@Module({
  imports: [DatabaseModule],
  providers: [DeliverableLifecycleService, RecurringDeliverableService],
  exports: [DeliverableLifecycleService, RecurringDeliverableService],
})
export class DeliverableLifecycleModule {}
