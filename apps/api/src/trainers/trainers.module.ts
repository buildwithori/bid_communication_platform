import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import {
  TrainerInvitationsController,
  TrainersController,
} from './trainers.controller';
import { TrainersEmailService } from './trainers-email.service';
import { TrainerManagementService } from './trainer-management.service';
import { TrainersService } from './trainers.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [TrainersController, TrainerInvitationsController],
  providers: [TrainersService, TrainerManagementService, TrainersEmailService],
  exports: [TrainersService],
})
export class TrainersModule {}
