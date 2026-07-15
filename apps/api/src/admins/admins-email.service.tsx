import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "../email/email.service";
import { AdminInvitationEmail } from "./emails/admin-invitation-email";

@Injectable()
export class AdminsEmailService {
  constructor(
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  sendInvitation(to: string, name: string, inviterName: string, token: string) {
    const url = `${this.webUrl()}/auth/accept-invitation?token=${encodeURIComponent(token)}`;
    return this.email.send({
      to,
      subject: "You are invited to the BID Hub admin team",
      template: (
        <AdminInvitationEmail
          name={name}
          inviterName={inviterName}
          url={url}
          logoUrl={`${this.webUrl()}/bid-logo.png`}
        />
      ),
    });
  }

  private webUrl() {
    return this.config.getOrThrow<string>("APP_WEB_URL").replace(/\/$/, "");
  }
}
