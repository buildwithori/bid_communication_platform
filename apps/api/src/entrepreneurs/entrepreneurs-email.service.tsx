import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { EntrepreneurInvitationEmail } from './emails/entrepreneur-invitation-email';

@Injectable()
export class EntrepreneursEmailService {
  constructor(
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  sendInvitation(
    to: string,
    name: string,
    businessName: string,
    inviterName: string,
    token: string,
  ) {
    const url = `${this.webUrl()}/auth/accept-invitation?role=entrepreneur&token=${encodeURIComponent(token)}`;
    return this.email.send({
      to,
      subject: 'Activate your BID Hub entrepreneur workspace',
      template: (
        <EntrepreneurInvitationEmail
          name={name}
          inviterName={inviterName}
          businessName={businessName}
          url={url}
          logoUrl={`${this.webUrl()}/bid-logo.png`}
        />
      ),
    });
  }

  private webUrl() {
    return this.config.getOrThrow<string>('APP_WEB_URL').replace(/\/$/, '');
  }
}
