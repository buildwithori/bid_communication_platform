import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { PasswordResetEmail } from './emails/password-reset-email';
import { VerificationEmail } from './emails/verification-email';
import { WelcomeEmail } from './emails/welcome-email';

@Injectable()
export class AuthEmailService {
  constructor(
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  sendVerification(to: string, name: string, token: string) {
    const url = `${this.webUrl()}/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
    return this.email.send({
      to,
      subject: 'Verify your BID Hub email',
      template: <VerificationEmail name={name} url={url} logoUrl={this.logoUrl()} />,
    });
  }

  sendPasswordReset(to: string, name: string, token: string) {
    const url = `${this.webUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
    return this.email.send({
      to,
      subject: 'Reset your BID Hub password',
      template: <PasswordResetEmail name={name} url={url} logoUrl={this.logoUrl()} />,
    });
  }

  sendWelcome(to: string, name: string) {
    return this.email.send({
      to,
      subject: 'Welcome to BID Hub',
      template: <WelcomeEmail name={name} dashboardUrl={`${this.webUrl()}/entrepreneur/dashboard`} logoUrl={this.logoUrl()} />,
    });
  }

  private logoUrl() {
    return `${this.webUrl()}/bid-logo.png`;
  }

  private webUrl() {
    return this.config.getOrThrow<string>('APP_WEB_URL').replace(/\/$/, '');
  }
}
