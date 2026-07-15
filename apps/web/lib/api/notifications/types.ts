export type NotificationType =
  | 'session_request'
  | 'session_confirmed'
  | 'session_rescheduled'
  | 'session_declined'
  | 'session_cancelled'
  | 'session_completed'
  | 'deliverable_review'
  | 'deliverable_changes_requested'
  | 'tool_request_updated'
  | 'trainer_nudge'
  | 'system';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';
export type NotificationEntityType =
  | 'session'
  | 'deliverable_instance'
  | 'tool_request'
  | 'programme'
  | 'entrepreneur'
  | 'content_item';

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
  actor: { id: string; name: string; email: string; role: 'admin' | 'trainer' | 'entrepreneur' } | null;
  deliveries: Array<{
    channel: 'in_app' | 'email';
    status: 'pending' | 'sent' | 'failed' | 'skipped';
    sentAt: string | null;
    failedAt: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPreference = {
  type: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type NotificationQuery = {
  type?: NotificationType;
  unreadOnly?: boolean;
  take?: number;
  cursor?: string;
};
