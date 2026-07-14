import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { FilesModule } from '../files/files.module';
import { ProgrammesController } from './programmes.controller';
import { ProgrammesService } from './programmes.service';

@Module({
  imports: [AuthModule, DatabaseModule, FilesModule],
  controllers: [ProgrammesController],
  providers: [ProgrammesService],
})
export class ProgrammesModule {}
