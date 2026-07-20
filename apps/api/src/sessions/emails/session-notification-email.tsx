import * as React from "react";
import { NotificationType, UserRole } from "@prisma/client";
import { NotificationEmail } from "../../notifications/emails/notification-email";

export type SessionNotificationEmailProps = {
  recipientName: string;
  recipientRole: UserRole;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl: string;
  logoUrl: string;
};

export function SessionNotificationEmail(props: SessionNotificationEmailProps) {
  const presentation = sessionPresentation(props.type, props.recipientRole);
  return (
    <NotificationEmail
      {...props}
      eyebrow="Session update"
      actionLabel={presentation.actionLabel}
      supportingText={presentation.supportingText}
    />
  );
}

function sessionPresentation(type: NotificationType, role: UserRole) {
  if (type === NotificationType.session_request) {
    return {
      actionLabel: "Review session request",
      supportingText:
        "Review the requested time, topic, and entrepreneur context before responding. Availability is checked again when a team member accepts.",
    };
  }
  if (type === NotificationType.session_declined) {
    return {
      actionLabel: "Review declined request",
      supportingText:
        "Open the request to review the reason. You can request another suitable time whenever you are ready.",
    };
  }
  if (type === NotificationType.session_cancelled) {
    return {
      actionLabel: "Review cancellation",
      supportingText:
        role === UserRole.entrepreneur
          ? "Open your schedule to review the cancellation and arrange another session if needed."
          : "Open the session to review the cancellation and any recorded reason.",
    };
  }
  if (type === NotificationType.session_rescheduled) {
    return {
      actionLabel: "View updated session",
      supportingText:
        "Review the new time and joining details. The connected calendar invitation has also been updated.",
    };
  }
  if (type === NotificationType.session_completed) {
    return {
      actionLabel: "View session details",
      supportingText:
        "The completed session remains available in BID Hub for your records and follow-up work.",
    };
  }
  if (type === NotificationType.session_reminder) {
    return {
      actionLabel: "Open upcoming session",
      supportingText:
        "Open the session before it starts to review the topic and joining details.",
    };
  }
  return {
    actionLabel: "View confirmed session",
    supportingText:
      "Open the session to review the confirmed time, participant, and joining details.",
  };
}

SessionNotificationEmail.PreviewProps = {
  recipientName: "Amara Mensah",
  recipientRole: UserRole.entrepreneur,
  type: NotificationType.session_declined,
  title: "Session request declined: Investor preparation",
  body: "Kofi declined your request for 24 Jul 2026 at 10:00 (Africa/Kigali). Reason: The trainer is unavailable.",
  actionUrl: "http://localhost:3000/entrepreneur/schedule?sessionId=preview",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies SessionNotificationEmailProps;

export default SessionNotificationEmail;
