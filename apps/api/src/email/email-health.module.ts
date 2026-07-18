import { Module } from '@nestjs/common';
import { EmailHealthService } from './email-health.service';

@Module({
  providers: [EmailHealthService],
  exports: [EmailHealthService],
})
export class EmailHealthModule {}
