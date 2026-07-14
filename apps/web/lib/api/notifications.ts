import { apiRequest } from './client';

export type NotificationType =
  | 'session_request'
  | 'session_confirmed'
  | 'session_rescheduled'
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
  actor: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'trainer' | 'entrepreneur';
  } | null;
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

function toQueryString(query?: NotificationQuery) {
  const params = new URLSearchParams();
  if (query?.type) params.set('type', query.type);
  if (query?.unreadOnly !== undefined) params.set('unreadOnly', String(query.unreadOnly));
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listNotifications(query?: NotificationQuery) {
  return apiRequest<{ items: NotificationRecord[]; nextCursor: string | null }>(
    `/notifications${toQueryString(query)}`,
  );
}

export function markNotificationRead(id: string) {
  return apiRequest<NotificationRecord>(`/notifications/${id}/read`, {
    method: 'POST',
  });
}

export function markAllNotificationsRead() {
  return apiRequest<{ updated: number }>('/notifications/read-all', {
    method: 'POST',
  });
}

export function listNotificationPreferences() {
  return apiRequest<NotificationPreference[]>('/notification-preferences');
}

export function updateNotificationPreference(
  type: NotificationType,
  payload: { inAppEnabled?: boolean; emailEnabled?: boolean },
) {
  return apiRequest<NotificationPreference>(`/notification-preferences/${type}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
