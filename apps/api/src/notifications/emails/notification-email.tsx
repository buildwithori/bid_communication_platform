import * as React from "react";
import { BidActionEmail } from "../../email/components/bid-action-email";

export type NotificationEmailProps = {
  recipientName: string;
  title: string;
  body: string;
  actionUrl: string;
  logoUrl: string;
  eyebrow?: string;
  actionLabel?: string;
  supportingText?: string;
};

export function NotificationEmail({
  recipientName = "BID Hub member",
  title = "You have a new notification",
  body = "There is new activity in your BID Hub workspace.",
  actionUrl = "http://localhost:3000",
  logoUrl = "http://localhost:3000/bid-logo.png",
  eyebrow = "BID Hub notification",
  actionLabel = "View in BID Hub",
  supportingText,
}: NotificationEmailProps) {
  return (
    <BidActionEmail
      preview={title}
      eyebrow={eyebrow}
      heading={title}
      greeting={`Hello ${recipientName},`}
      body={body}
      actionLabel={actionLabel}
      actionUrl={actionUrl}
      supportingText={supportingText}
      logoUrl={logoUrl}
      preferenceNote="You can manage email and in-app notification preferences from your workspace settings."
    />
  );
}

NotificationEmail.PreviewProps = {
  recipientName: "Amara",
  title: "Your session request was confirmed",
  body: "Kofi confirmed your investor preparation session for Friday at 10:00 AM.",
  actionUrl: "http://localhost:3000/entrepreneur/schedule",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies NotificationEmailProps;

export default NotificationEmail;
