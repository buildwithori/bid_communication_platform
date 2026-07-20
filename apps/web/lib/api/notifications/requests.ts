import { apiRequest } from "../client";
import type {
  NotificationAutomationPreference,
  NotificationAutomationPreferenceUpdate,
  NotificationPage,
  NotificationPreference,
  NotificationPreferenceGroup,
  NotificationPreferenceGroupName,
  NotificationPreferenceUpdate,
  NotificationQuery,
  NotificationRecord,
  NotificationSummary,
  NotificationType,
} from "./types";

function toQueryString(query?: NotificationQuery) {
  const params = new URLSearchParams();
  if (query?.type) params.set("type", query.type);
  if (query?.unreadOnly !== undefined)
    params.set("unreadOnly", String(query.unreadOnly));
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listNotificationsRequest(query?: NotificationQuery) {
  return apiRequest<NotificationPage>(`/notifications${toQueryString(query)}`);
}

export function notificationSummaryRequest() {
  return apiRequest<NotificationSummary>("/notifications/summary");
}

export function markNotificationReadRequest(id: string) {
  return apiRequest<NotificationRecord>(`/notifications/${id}/read`, {
    method: "POST",
  });
}

export function markAllNotificationsReadRequest() {
  return apiRequest<{ updated: number }>("/notifications/read-all", {
    method: "POST",
  });
}

export function listNotificationPreferencesRequest() {
  return apiRequest<NotificationPreference[]>("/notification-preferences");
}

export function listNotificationPreferenceGroupsRequest() {
  return apiRequest<NotificationPreferenceGroup[]>(
    "/notification-preferences/groups",
  );
}

export function getNotificationAutomationPreferenceRequest() {
  return apiRequest<NotificationAutomationPreference>(
    "/notification-preferences/automation",
  );
}

export function updateNotificationAutomationPreferenceRequest(
  payload: NotificationAutomationPreferenceUpdate,
) {
  return apiRequest<NotificationAutomationPreference>(
    "/notification-preferences/automation",
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export function updateNotificationPreferenceGroupRequest(
  group: NotificationPreferenceGroupName,
  payload: NotificationPreferenceUpdate,
) {
  return apiRequest<NotificationPreferenceGroup>(
    "/notification-preferences/groups/" + group,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export function updateNotificationPreferenceRequest(
  type: NotificationType,
  payload: NotificationPreferenceUpdate,
) {
  return apiRequest<NotificationPreference>(
    `/notification-preferences/${type}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}
