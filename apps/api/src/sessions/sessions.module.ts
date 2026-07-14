import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
