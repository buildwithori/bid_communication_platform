import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { TrainerInvitationEmail } from './emails/trainer-invitation-email';

@Injectable()
export class TrainersEmailService {
  constructor(private readonly email: EmailService) {}

  sendInvitation(to: string, name: string, inviterName: string, token: string) {
    const url = `${this.email.appUrl()}/auth/accept-invitation?role=trainer&token=${encodeURIComponent(token)}`;
    return this.email.send({
      to,
      subject: 'You are invited to the BID Hub trainer team',
      template: (
        <TrainerInvitationEmail
          name={name}
          inviterName={inviterName}
          url={url}
          logoUrl={this.email.logoUrl()}
        />
      ),
    });
  }

}
