import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { SettingsModule } from './settings/settings.module';
import { ProgrammesModule } from './programmes/programmes.module';
import { EntrepreneursModule } from './entrepreneurs/entrepreneurs.module';

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
  ],
})
export class AppModule {}
