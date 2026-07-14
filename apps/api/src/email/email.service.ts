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

  async renderTemplate(template: React.ReactElement) {
    const html = await render(template);
    return { html, text: toPlainText(html) };
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
