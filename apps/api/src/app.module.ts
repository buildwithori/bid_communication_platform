import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { SettingsModule } from './settings/settings.module';
import { ProgrammesModule } from './programmes/programmes.module';
import { EntrepreneursModule } from './entrepreneurs/entrepreneurs.module';
import { TrainersModule } from './trainers/trainers.module';
import { SessionsModule } from './sessions/sessions.module';
import { LearningModule } from './learning/learning.module';
import { ContentModule } from './content/content.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { ToolsModule } from './tools/tools.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    SettingsModule,
    ProgrammesModule,
    EntrepreneursModule,
    TrainersModule,
    SessionsModule,
    LearningModule,
    ContentModule,
    DeliverablesModule,
    ToolsModule,
    FilesModule,
  ],
})
export class AppModule {}
