import * as React from "react";
import { BidActionEmail } from "../../email/components/bid-action-email";

export type NotificationEmailProps = {
  recipientName: string;
  title: string;
  body: string;
  actionUrl: string;
  logoUrl: string;
};

export function NotificationEmail({
  recipientName = "BID Hub member",
  title = "You have a new notification",
  body = "There is new activity in your BID Hub workspace.",
  actionUrl = "http://localhost:3000",
  logoUrl = "http://localhost:3000/bid-logo.png",
}: NotificationEmailProps) {
  return (
    <BidActionEmail
      preview={title}
      eyebrow="BID Hub notification"
      heading={title}
      greeting={`Hello ${recipientName},`}
      body={body}
      actionLabel="View in BID Hub"
      actionUrl={actionUrl}
      logoUrl={logoUrl}
      expiryNote="You can manage email and in-app notification preferences from your workspace settings."
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
