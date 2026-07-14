import * as React from 'react';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { createTransport } from 'nodemailer';
import { Resend } from 'resend';
import { PasswordResetEmail, VerificationEmail, WelcomeEmail } from './templates/auth-email.templates';

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  sendVerification(to: string, name: string, token: string) {
    const url = `${this.webUrl()}/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
    return this.send(to, 'Verify your BID Hub email', VerificationEmail({ name, url }));
  }

  sendPasswordReset(to: string, name: string, token: string) {
    const url = `${this.webUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
    return this.send(to, 'Reset your BID Hub password', PasswordResetEmail({ name, url }));
  }

  sendWelcome(to: string, name: string) {
    return this.send(to, 'Welcome to BID Hub', WelcomeEmail({ name, dashboardUrl: `${this.webUrl()}/entrepreneur/dashboard` }));
  }

  private async send(to: string, subject: string, template: React.ReactElement) {
    const html = await render(template);
    const from = this.config.getOrThrow<string>('MAIL_FROM');
    if (this.config.get<string>('EMAIL_TRANSPORT') === 'resend') {
      const apiKey = this.config.get<string>('RESEND_API_KEY');
      if (!apiKey) throw new ServiceUnavailableException('Production email delivery is not configured.');
      const result = await new Resend(apiKey).emails.send({ from, to, subject, html });
      if (result.error) throw new ServiceUnavailableException('Email delivery failed.');
      return;
    }
    const transport = createTransport({ host: this.config.getOrThrow<string>('SMTP_HOST'), port: this.config.getOrThrow<number>('SMTP_PORT'), secure: false });
    await transport.sendMail({ from, to, subject, html });
  }

  private webUrl() {
    return this.config.getOrThrow<string>('APP_WEB_URL').replace(/\/$/, '');
  }
}
