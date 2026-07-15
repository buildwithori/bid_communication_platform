import { apiRequest } from '../client';
import type { NotificationPreference, NotificationQuery, NotificationRecord, NotificationType } from './types';

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
  return apiRequest<{ items: NotificationRecord[]; nextCursor: string | null }>(`/notifications${toQueryString(query)}`);
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
