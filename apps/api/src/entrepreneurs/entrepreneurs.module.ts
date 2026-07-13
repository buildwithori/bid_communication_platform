import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { EntrepreneursController } from './entrepreneurs.controller';
import { EntrepreneursService } from './entrepreneurs.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [EntrepreneursController],
  providers: [EntrepreneursService],
})
export class EntrepreneursModule {}
