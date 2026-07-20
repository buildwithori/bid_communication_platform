import * as React from "react";
import { BidActionEmail } from "../../email/components/bid-action-email";

export type PasswordResetEmailProps = {
  name: string;
  url: string;
  logoUrl: string;
};

export function PasswordResetEmail({
  name = "Amara",
  url = "http://localhost:3000/auth/reset-password?token=preview-token",
  logoUrl = "http://localhost:3000/bid-logo.png",
}: PasswordResetEmailProps) {
  return (
    <BidActionEmail
      preview="Reset your BID Hub password"
      heading="Reset your password"
      greeting={`Hello ${name},`}
      body="We received a request to create a new password for your BID Hub account."
      supportingText="Use the secure button below to choose a new password. Your current password remains unchanged until you complete the reset."
      details={[
        { label: "Request", value: "Password reset" },
        { label: "Link validity", value: "30 minutes" },
      ]}
      actionLabel="Reset password"
      actionUrl={url}
      logoUrl={logoUrl}
      expiryNote="This link expires in 30 minutes. If you did not request a reset, you can safely ignore this email."
    />
  );
}

PasswordResetEmail.PreviewProps = {
  name: "Amara",
  url: "http://localhost:3000/auth/reset-password?token=preview-token",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;
