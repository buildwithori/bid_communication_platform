import { apiRequest } from '../client';
import type { NotificationPage, NotificationPreference, NotificationQuery, NotificationRecord, NotificationSummary, NotificationType } from './types';

function toQueryString(query?: NotificationQuery) {
  const params = new URLSearchParams();
  if (query?.type) params.set('type', query.type);
  if (query?.unreadOnly !== undefined) params.set('unreadOnly', String(query.unreadOnly));
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listNotificationsRequest(query?: NotificationQuery) {
  return apiRequest<NotificationPage>(`/notifications${toQueryString(query)}`);
}

export function notificationSummaryRequest() {
  return apiRequest<NotificationSummary>('/notifications/summary');
}

export function markNotificationReadRequest(id: string) {
  return apiRequest<NotificationRecord>(`/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsReadRequest() {
  return apiRequest<{ updated: number }>('/notifications/read-all', { method: 'POST' });
}

export function listNotificationPreferencesRequest() {
  return apiRequest<NotificationPreference[]>('/notification-preferences');
}

export function updateNotificationPreferenceRequest(type: NotificationType, payload: { inAppEnabled?: boolean; emailEnabled?: boolean }) {
  return apiRequest<NotificationPreference>(`/notification-preferences/${type}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
