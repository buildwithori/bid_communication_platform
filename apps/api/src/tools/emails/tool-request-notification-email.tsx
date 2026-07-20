import * as React from "react";
import { UserRole } from "@prisma/client";
import { NotificationEmail } from "../../notifications/emails/notification-email";

export type ToolRequestNotificationEmailProps = {
  recipientName: string;
  recipientRole: UserRole;
  title: string;
  body: string;
  actionUrl: string;
  logoUrl: string;
};

export function ToolRequestNotificationEmail(
  props: ToolRequestNotificationEmailProps,
) {
  const admin = props.recipientRole === UserRole.admin;
  return (
    <NotificationEmail
      {...props}
      eyebrow="Tool request update"
      actionLabel={admin ? "Review tool request" : "View request details"}
      supportingText={
        admin
          ? "Review the business need and request details before updating its status or linking a completed tool."
          : "Open the request to review its current status, the BID team decision, and any linked resource."
      }
    />
  );
}

ToolRequestNotificationEmail.PreviewProps = {
  recipientName: "BID Administrator",
  recipientRole: UserRole.admin,
  title: "New tool request: Cash-flow planner",
  body: "Akwaaba Foods requested a cash-flow planner to prepare monthly forecasts for investor reporting.",
  actionUrl: "http://localhost:3000/admin/tool-requests?requestId=preview",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies ToolRequestNotificationEmailProps;

export default ToolRequestNotificationEmail;
