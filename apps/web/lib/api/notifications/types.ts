export type NotificationType =
  | "session_request"
  | "session_confirmed"
  | "session_rescheduled"
  | "session_declined"
  | "session_cancelled"
  | "session_completed"
  | "session_reminder"
  | "deliverable_review"
  | "deliverable_changes_requested"
  | "deliverable_due_reminder"
  | "tool_request_updated"
  | "trainer_nudge"
  | "system"
  | "weekly_digest";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";
export type NotificationEntityType =
  | "session"
  | "deliverable_instance"
  | "tool_request"
  | "programme"
  | "entrepreneur"
  | "content_item";

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  severity: NotificationSeverity;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  actionUrl: string | null;
  readAt: string | null;
  actor: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "trainer" | "entrepreneur";
  } | null;
  deliveries: Array<{
    channel: "in_app" | "email";
    status: "pending" | "processing" | "sent" | "failed" | "skipped";
    sentAt: string | null;
    failedAt: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPreference = {
  type: NotificationType;
  inAppOverride: boolean | null;
  emailOverride: boolean | null;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type NotificationPreferenceGroupName =
  "sessions" | "deliverables" | "tools" | "coaching" | "product";

export type NotificationPreferenceGroup = {
  group: NotificationPreferenceGroupName;
  types: NotificationType[];
  inAppMode: NotificationPreferenceMode;
  emailMode: NotificationPreferenceMode;
  inAppEnabled: boolean | null;
  emailEnabled: boolean | null;
  defaults: { inAppEnabled: boolean; emailEnabled: boolean };
};

export type NotificationPreferenceMode =
  "inherit" | "enabled" | "disabled" | "mixed";

export type NotificationPreferenceUpdate = {
  inAppEnabled?: boolean | null;
  emailEnabled?: boolean | null;
};

export type NotificationAutomationPreference = {
  reminderOverride: boolean | null;
  reminderEnabled: boolean;
  weeklyDigestOverride: boolean | null;
  weeklyDigestEnabled: boolean;
  defaults: { reminderEnabled: boolean; weeklyDigestEnabled: boolean };
};

export type NotificationAutomationPreferenceUpdate = {
  reminderEnabled?: boolean | null;
  weeklyDigestEnabled?: boolean | null;
};

export type NotificationSummary = {
  unreadCount: number;
  totalCount: number;
};

export type NotificationPage = {
  items: NotificationRecord[];
  nextCursor: string | null;
};

export type NotificationQuery = {
  type?: NotificationType;
  unreadOnly?: boolean;
  take?: number;
  cursor?: string;
};
