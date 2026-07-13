import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [TrainersController],
  providers: [TrainersService],
})
export class TrainersModule {}
