export const QUEUE_NAMES = {
  audit: "bid-audit",
  notificationDelivery: "bid-notification-delivery",
  notificationAutomation: "bid-notification-automation",
  recurringDeliverables: "bid-recurring-deliverables",
  transactionalEmail: "bid-transactional-email",
  reportExports: "bid-report-exports",
  externalResourceCleanup: "bid-external-resource-cleanup",
  videoReconciliation: "bid-video-reconciliation",
  calendarSync: "bid-calendar-sync",
} as const;

export const JOB_NAMES = {
  processAuditOutbox: "process-audit-outbox",
  deliverNotifications: "deliver-notifications",
  runNotificationAutomation: "run-notification-automation",
  syncRecurringDeliverables: "sync-recurring-deliverables",
  authVerificationEmail: "auth-verification-email",
  authPasswordResetEmail: "auth-password-reset-email",
  authWelcomeEmail: "auth-welcome-email",
  adminWelcomeEmail: "admin-welcome-email",
  trainerWelcomeEmail: "trainer-welcome-email",
  entrepreneurWelcomeEmail: "entrepreneur-welcome-email",
  adminInvitationEmail: "admin-invitation-email",
  trainerInvitationEmail: "trainer-invitation-email",
  entrepreneurInvitationEmail: "entrepreneur-invitation-email",
  generateReportExport: "generate-report-export",
  cleanupExternalResources: "cleanup-external-resources",
  reconcileVideoAssets: "reconcile-video-assets",
  reconcileCalendarEvents: "reconcile-calendar-events",
  reconcileCalendarConnection: "reconcile-calendar-connection",
  reconcileCalendarProvisioning: "reconcile-calendar-provisioning",
  provisionSessionCalendar: "provision-session-calendar",
} as const;

export const QUEUE_PREFIX = "bid-hub";

export const WORKER_HEARTBEAT_KEY = "bid-hub:worker:heartbeat";
