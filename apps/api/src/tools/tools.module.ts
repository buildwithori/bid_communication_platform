import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { FilesModule } from '../files/files.module';
import { ToolsController } from './tools.controller';
import { ToolRequestsController } from './tool-requests.controller';
import { ToolRequestsService } from './tool-requests.service';
import { ToolsService } from './tools.service';

@Module({
  imports: [AuthModule, DatabaseModule, FilesModule],
  controllers: [ToolsController, ToolRequestsController],
  providers: [ToolsService, ToolRequestsService],
})
export class ToolsModule {}
