import * as React from 'react';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { render, toPlainText } from 'react-email';
import { Resend } from 'resend';

export type EmailMessage = {
  to: string | string[];
  subject: string;
  template: React.ReactElement;
};

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  appUrl(path = '') {
    const root = this.config.getOrThrow<string>('APP_WEB_URL').replace(/\/$/, '');
    if (!path) return root;
    return root + (path.startsWith('/') ? path : '/' + path);
  }

  logoUrl() {
    return this.appUrl('/bid-logo.png');
  }

  async renderTemplate(template: React.ReactElement) {
    const html = await render(template);
    return { html, text: toPlainText(html) };
  }

  async healthCheck() {
    if (this.config.get<string>('EMAIL_TRANSPORT') === 'resend') {
      if (!this.config.get<string>('RESEND_API_KEY')) {
        throw new ServiceUnavailableException(
          'Production email delivery is not configured.',
        );
      }
      return { transport: 'resend' as const, status: 'configured' as const };
    }

    const transport = createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: this.config.getOrThrow<number>('SMTP_PORT'),
      secure: false,
      connectionTimeout: 2_000,
      greetingTimeout: 2_000,
      socketTimeout: 2_000,
    });
    try {
      await transport.verify();
      return { transport: 'smtp' as const, status: 'connected' as const };
    } finally {
      transport.close();
    }
  }

  async send(message: EmailMessage) {
    const { html, text } = await this.renderTemplate(message.template);
    const from = this.config.getOrThrow<string>('MAIL_FROM');

    if (this.config.get<string>('EMAIL_TRANSPORT') === 'resend') {
      const apiKey = this.config.get<string>('RESEND_API_KEY');
      if (!apiKey) throw new ServiceUnavailableException('Production email delivery is not configured.');
      const result = await new Resend(apiKey).emails.send({ from, to: message.to, subject: message.subject, html, text });
      if (result.error) throw new ServiceUnavailableException('Email delivery failed.');
      return result.data;
    }

    const transport = createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: this.config.getOrThrow<number>('SMTP_PORT'),
      secure: false,
    });
    return transport.sendMail({ from, to: message.to, subject: message.subject, html, text });
  }
}
