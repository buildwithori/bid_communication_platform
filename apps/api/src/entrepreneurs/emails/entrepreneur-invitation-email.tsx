import * as React from "react";
import { BidActionEmail } from "../../email/components/bid-action-email";

export type EntrepreneurInvitationEmailProps = {
  name: string;
  inviterName: string;
  businessName: string;
  url: string;
  logoUrl: string;
};

export function EntrepreneurInvitationEmail({
  name = "Ama",
  inviterName = "BID Hub operations",
  businessName = "Your business",
  url = "http://localhost:3000/auth/accept-invitation?role=entrepreneur&token=preview-token",
  logoUrl = "http://localhost:3000/bid-logo.png",
}: EntrepreneurInvitationEmailProps) {
  return (
    <BidActionEmail
      eyebrow="BID Hub entrepreneur invitation"
      preview="Your BID Hub entrepreneur workspace is ready"
      heading="Activate your BID Hub workspace"
      greeting={`Hello ${name},`}
      body={
        inviterName +
        " created a BID Hub workspace for " +
        businessName +
        ". Activate your account to access learning, deliverables, goals, business updates, tools, and BID support."
      }
      supportingText="Accept the invitation to create your password and confirm your workspace details."
      details={[
        { label: "Business", value: businessName },
        { label: "Role", value: "Entrepreneur" },
        { label: "Invited by", value: inviterName },
      ]}
      actionLabel="Activate workspace"
      actionUrl={url}
      logoUrl={logoUrl}
      expiryNote="This invitation expires in 7 days. If you were not expecting it, you can safely ignore this email."
    />
  );
}

EntrepreneurInvitationEmail.PreviewProps = {
  name: "Ama",
  inviterName: "BID Hub operations",
  businessName: "Akwaaba Foods",
  url: "http://localhost:3000/auth/accept-invitation?role=entrepreneur&token=preview-token",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies EntrepreneurInvitationEmailProps;

export default EntrepreneurInvitationEmail;
