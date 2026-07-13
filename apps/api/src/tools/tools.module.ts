import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ToolsController],
  providers: [ToolsService],
})
export class ToolsModule {}
