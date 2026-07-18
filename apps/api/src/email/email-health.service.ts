import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class EmailHealthService {
  constructor(private readonly config: ConfigService) {}

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
}
