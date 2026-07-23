import * as React from "react";
import { BidActionEmail } from "../../email/components/bid-action-email";

export type EntrepreneurWelcomeEmailProps = {
  name: string;
  dashboardUrl: string;
  logoUrl: string;
};

export function EntrepreneurWelcomeEmail({
  name = "Amara",
  dashboardUrl = "http://localhost:3000/entrepreneur/dashboard",
  logoUrl = "http://localhost:3000/bid-logo.png",
}: EntrepreneurWelcomeEmailProps) {
  return (
    <BidActionEmail
      eyebrow="BID Hub entrepreneur"
      platformLabel="Entrepreneur workspace"
      preview="Your BID Hub entrepreneur workspace is ready"
      heading="Your entrepreneur workspace is ready"
      greeting={`Welcome ${name},`}
      body="Your BID Hub entrepreneur account is active and your workspace is ready."
      supportingText="Start from your dashboard to review current learning, upcoming work, available tools, and BID support. Keep your business profile current so programme and reporting information stays accurate."
      details={[
        { label: "Workspace", value: "Entrepreneur" },
        { label: "Account status", value: "Active" },
      ]}
      actionLabel="Open entrepreneur workspace"
      actionUrl={dashboardUrl}
      logoUrl={logoUrl}
    />
  );
}

EntrepreneurWelcomeEmail.PreviewProps = {
  name: "Amara",
  dashboardUrl: "http://localhost:3000/entrepreneur/dashboard",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies EntrepreneurWelcomeEmailProps;

export default EntrepreneurWelcomeEmail;
