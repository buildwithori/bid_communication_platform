import * as React from "react";
import { BidActionEmail } from "../../email/components/bid-action-email";

export type AdminInvitationEmailProps = {
  name: string;
  inviterName: string;
  url: string;
  logoUrl: string;
};

export function AdminInvitationEmail({
  name = "Ama",
  inviterName = "BID Hub operations",
  url = "http://localhost:3000/auth/accept-invitation?token=preview-token",
  logoUrl = "http://localhost:3000/bid-logo.png",
}: AdminInvitationEmailProps) {
  return (
    <BidActionEmail
      eyebrow="BID Hub admin invitation"
      preview="You have been invited to the BID Hub admin workspace"
      heading="Join the BID Hub admin team"
      greeting={`Hello ${name},`}
      body={`${inviterName} invited you to help operate programmes, entrepreneurs, sessions, and reporting in BID Hub.`}
      actionLabel="Accept invitation"
      actionUrl={url}
      logoUrl={logoUrl}
      expiryNote="This invitation expires in 7 days. If you were not expecting it, you can safely ignore this email."
    />
  );
}

AdminInvitationEmail.PreviewProps = {
  name: "Ama",
  inviterName: "BID Hub operations",
  url: "http://localhost:3000/auth/accept-invitation?token=preview-token",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies AdminInvitationEmailProps;

export default AdminInvitationEmail;
