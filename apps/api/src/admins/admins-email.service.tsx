import { Injectable } from "@nestjs/common";
import { EmailService } from "../email/email.service";
import { AdminInvitationEmail } from "./emails/admin-invitation-email";

@Injectable()
export class AdminsEmailService {
  constructor(private readonly email: EmailService) {}

  sendInvitation(to: string, name: string, inviterName: string, token: string) {
    const url = `${this.email.appUrl()}/auth/accept-invitation?token=${encodeURIComponent(token)}`;
    return this.email.send({
      to,
      subject: "You are invited to the BID Hub admin team",
      template: (
        <AdminInvitationEmail
          name={name}
          inviterName={inviterName}
          url={url}
          logoUrl={this.email.logoUrl()}
        />
      ),
    });
  }

}
