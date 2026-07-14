import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AuthEmailService } from './auth-email.service';
import { GoogleAuthService } from './google-auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthEmailService, GoogleAuthService, SessionAuthGuard, RolesGuard],
  exports: [AuthService, SessionAuthGuard, RolesGuard],
})
export class AuthModule {}
