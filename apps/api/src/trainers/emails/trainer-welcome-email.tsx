import * as React from "react";
import { BidActionEmail } from "../../email/components/bid-action-email";

export type TrainerWelcomeEmailProps = {
  name: string;
  dashboardUrl: string;
  logoUrl: string;
};

export function TrainerWelcomeEmail({
  name = "Kofi",
  dashboardUrl = "http://localhost:3000/trainer/dashboard",
  logoUrl = "http://localhost:3000/bid-logo.png",
}: TrainerWelcomeEmailProps) {
  return (
    <BidActionEmail
      eyebrow="BID Hub trainer"
      platformLabel="Trainer workspace"
      preview="Your BID Hub trainer workspace is ready"
      heading="Your trainer workspace is ready"
      greeting={`Welcome ${name},`}
      body="Your invitation has been accepted and your trainer account is now active."
      supportingText="Start by reviewing the entrepreneurs and programmes you support, then connect your calendar so available session times stay accurate. You can manage your notification preferences from Settings."
      details={[
        { label: "Workspace", value: "Trainer" },
        { label: "Account status", value: "Active" },
      ]}
      actionLabel="Open trainer workspace"
      actionUrl={dashboardUrl}
      logoUrl={logoUrl}
    />
  );
}

TrainerWelcomeEmail.PreviewProps = {
  name: "Kofi",
  dashboardUrl: "http://localhost:3000/trainer/dashboard",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies TrainerWelcomeEmailProps;

export default TrainerWelcomeEmail;
