import * as React from "react";
import { NotificationType, UserRole } from "@prisma/client";
import { NotificationEmail } from "../../notifications/emails/notification-email";

export type DeliverableNotificationEmailProps = {
  recipientName: string;
  recipientRole: UserRole;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl: string;
  logoUrl: string;
};

export function DeliverableNotificationEmail(
  props: DeliverableNotificationEmailProps,
) {
  const changesRequested =
    props.type === NotificationType.deliverable_changes_requested;
  const reminder = props.type === NotificationType.deliverable_due_reminder;
  const reviewer = props.recipientRole !== UserRole.entrepreneur;
  return (
    <NotificationEmail
      {...props}
      eyebrow="Deliverable update"
      actionLabel={
        reminder
          ? "Open deliverable"
          : changesRequested
            ? "Review feedback"
            : reviewer
              ? "Review submission"
              : "View decision"
      }
      supportingText={
        reminder
          ? "Open the deliverable to confirm the requirement and submit before the deadline."
          : changesRequested
            ? "Review the feedback carefully, update your work, and submit a revised file from the same deliverable page."
            : reviewer
              ? "Open the submission to review the uploaded file and record a clear decision for the entrepreneur."
              : "The review decision and submission history remain available in your deliverable workspace."
      }
    />
  );
}

DeliverableNotificationEmail.PreviewProps = {
  recipientName: "BID Reviewer",
  recipientRole: UserRole.trainer,
  type: NotificationType.deliverable_review,
  title: "Deliverable ready for review: Financial model",
  body: "Akwaaba Foods submitted “Financial model” for Growth Programme. File: financial-model.xlsx.",
  actionUrl: "http://localhost:3000/trainer/deliverable-reviews",
  logoUrl: "http://localhost:3000/bid-logo.png",
} satisfies DeliverableNotificationEmailProps;

export default DeliverableNotificationEmail;
