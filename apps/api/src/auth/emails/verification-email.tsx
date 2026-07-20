import * as React from "react";
import { BidActionEmail } from "../../email/components/bid-action-email";

export type VerificationEmailProps = {
  name: string;
  url: string;
  logoUrl: string;
};

export function VerificationEmail({
  name = "Amara",
  url = "http://localhost:3000/auth/verify-email?token=preview-token",
  logoUrl = "http://localhost:3000/bid-logo.png",
}: VerificationEmailProps) {
  return (
    <BidActionEmail
      preview="Verify your BID Hub email"
      heading="Verify your email"
      greeting={`Hello ${name},`}
      body="Confirm this email address so we can secure your account and activate your entrepreneur workspace."
      supportingText="Once verified, you can sign in to access your learning, deliverables, sessions, tools, and business updates."
      details={[
        { label: "Workspace", value: "Entrepreneur" },
        { label: "Link validity", value: "24 hours" },
      ]}
      actionLabel="Verify email"
      actionUrl={url}
      logoUrl={logoUrl}
      expiryNote="This link expires in 24 hours. If you did not create this account, you can safely ignore this email."
    />
  );
}

VerificationEmail.PreviewProps = {
  name: "Amara",
  url: "http://localhost:3000/auth/verify-email?token=preview-token",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies VerificationEmailProps;

export default VerificationEmail;
