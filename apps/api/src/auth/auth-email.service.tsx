import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PasswordResetEmail } from './emails/password-reset-email';
import { VerificationEmail } from './emails/verification-email';
import { WelcomeEmail } from './emails/welcome-email';

@Injectable()
export class AuthEmailService {
  constructor(private readonly email: EmailService) {}

  sendVerification(to: string, name: string, token: string) {
    const url = `${this.email.appUrl()}/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
    return this.email.send({
      to,
      subject: 'Verify your BID Hub email',
      template: <VerificationEmail name={name} url={url} logoUrl={this.email.logoUrl()} />,
    });
  }

  sendPasswordReset(to: string, name: string, token: string) {
    const url = `${this.email.appUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
    return this.email.send({
      to,
      subject: 'Reset your BID Hub password',
      template: <PasswordResetEmail name={name} url={url} logoUrl={this.email.logoUrl()} />,
    });
  }

  sendWelcome(to: string, name: string) {
    return this.email.send({
      to,
      subject: 'Welcome to BID Hub',
      template: <WelcomeEmail name={name} dashboardUrl={this.email.appUrl('/entrepreneur/dashboard')} logoUrl={this.email.logoUrl()} />,
    });
  }

}
