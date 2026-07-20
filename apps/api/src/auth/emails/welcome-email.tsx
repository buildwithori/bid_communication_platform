import * as React from "react";
import { BidActionEmail } from "../../email/components/bid-action-email";

export type WelcomeEmailProps = {
  name: string;
  dashboardUrl: string;
  logoUrl: string;
};

export function WelcomeEmail({
  name = "Amara",
  dashboardUrl = "http://localhost:3000/entrepreneur/dashboard",
  logoUrl = "http://localhost:3000/bid-logo.png",
}: WelcomeEmailProps) {
  return (
    <BidActionEmail
      preview="Welcome to BID Hub"
      heading="Your workspace is ready"
      greeting={`Welcome ${name},`}
      body="Your email is verified and your BID Hub entrepreneur workspace is ready."
      supportingText="Start by reviewing your dashboard, exploring available learning resources, and keeping your business profile up to date so the BID team can support you effectively."
      details={[
        { label: "Workspace", value: "Entrepreneur" },
        { label: "Account status", value: "Active" },
      ]}
      actionLabel="Open BID Hub"
      actionUrl={dashboardUrl}
      logoUrl={logoUrl}
    />
  );
}

WelcomeEmail.PreviewProps = {
  name: "Amara",
  dashboardUrl: "http://localhost:3000/entrepreneur/dashboard",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
