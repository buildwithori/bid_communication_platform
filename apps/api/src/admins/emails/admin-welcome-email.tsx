import * as React from "react";
import { BidActionEmail } from "../../email/components/bid-action-email";

export type AdminWelcomeEmailProps = {
  name: string;
  dashboardUrl: string;
  logoUrl: string;
};

export function AdminWelcomeEmail({
  name = "Ama",
  dashboardUrl = "http://localhost:3000/admin/dashboard",
  logoUrl = "http://localhost:3000/bid-logo.png",
}: AdminWelcomeEmailProps) {
  return (
    <BidActionEmail
      eyebrow="BID Hub administrator"
      platformLabel="Admin workspace"
      preview="Your BID Hub admin workspace is active"
      heading="Welcome to the BID Hub admin team"
      greeting={`Welcome ${name},`}
      body="Your invitation has been accepted and your administrator account is now active."
      supportingText="Open your workspace to manage programmes, people, sessions, deliverables, platform settings, and reporting. Your notification preferences can be adjusted from Admin Settings."
      details={[
        { label: "Workspace", value: "Administration" },
        { label: "Account status", value: "Active" },
      ]}
      actionLabel="Open admin workspace"
      actionUrl={dashboardUrl}
      logoUrl={logoUrl}
    />
  );
}

AdminWelcomeEmail.PreviewProps = {
  name: "Ama",
  dashboardUrl: "http://localhost:3000/admin/dashboard",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies AdminWelcomeEmailProps;

export default AdminWelcomeEmail;
