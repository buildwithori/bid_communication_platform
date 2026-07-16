export const QUEUE_NAMES = {
  audit: "bid-audit",
  notificationDelivery: "bid-notification-delivery",
  recurringDeliverables: "bid-recurring-deliverables",
  transactionalEmail: "bid-transactional-email",
} as const;

export const JOB_NAMES = {
  processAuditOutbox: "process-audit-outbox",
  deliverNotifications: "deliver-notifications",
  syncRecurringDeliverables: "sync-recurring-deliverables",
  authVerificationEmail: "auth-verification-email",
  authPasswordResetEmail: "auth-password-reset-email",
  authWelcomeEmail: "auth-welcome-email",
  adminInvitationEmail: "admin-invitation-email",
  trainerInvitationEmail: "trainer-invitation-email",
  entrepreneurInvitationEmail: "entrepreneur-invitation-email",
} as const;

export const QUEUE_PREFIX = "bid-hub";

export const WORKER_HEARTBEAT_KEY = "bid-hub:worker:heartbeat";
