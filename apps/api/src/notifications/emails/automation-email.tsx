import * as React from "react";
import { NotificationType } from "@prisma/client";
import { NotificationEmail } from "./notification-email";

export type AutomationEmailProps = {
  recipientName: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl: string;
  logoUrl: string;
};

export function AutomationEmail(props: AutomationEmailProps) {
  const digest = props.type === NotificationType.weekly_digest;
  return (
    <NotificationEmail
      {...props}
      eyebrow={digest ? "Your week in BID Hub" : "BID Hub reminder"}
      actionLabel={digest ? "Open your dashboard" : "Review upcoming work"}
      supportingText={
        digest
          ? "Use this summary to prioritise unread activity and upcoming work for the week ahead."
          : "Open BID Hub to review the item and take action before it is due."
      }
    />
  );
}

AutomationEmail.PreviewProps = {
  recipientName: "Amara Mensah",
  type: NotificationType.weekly_digest,
  title: "Your weekly BID Hub summary",
  body: "3 unread updates and 1 upcoming session, with 2 deliverables due in the next 7 days.",
  actionUrl: "http://localhost:3000/entrepreneur/dashboard",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies AutomationEmailProps;

export default AutomationEmail;
