import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { SettingsModule } from './settings/settings.module';
import { ProgrammesModule } from './programmes/programmes.module';
import { EntrepreneursModule } from './entrepreneurs/entrepreneurs.module';
import { TrainersModule } from './trainers/trainers.module';
import { AdminsModule } from './admins/admins.module';
import { CalendarModule } from './calendar/calendar.module';
import { SessionsModule } from './sessions/sessions.module';
import { LearningModule } from './learning/learning.module';
import { ContentModule } from './content/content.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { ToolsModule } from './tools/tools.module';
import { FilesModule } from './files/files.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { RolesGuard } from './auth/guards/roles.guard';
import { SessionAuthGuard } from './auth/guards/session-auth.guard';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { RequestContextInterceptor } from './common/request-context/request-context.interceptor';
import { RequestContextModule } from './common/request-context/request-context.module';
import { RequestIdMiddleware } from './common/request-context/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    RequestContextModule,
    EmailModule,
    AuthModule,
    HealthModule,
    SettingsModule,
    ProgrammesModule,
    EntrepreneursModule,
    TrainersModule,
    AdminsModule,
    CalendarModule,
    SessionsModule,
    LearningModule,
    ContentModule,
    DeliverablesModule,
    ToolsModule,
    FilesModule,
    NotificationsModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
