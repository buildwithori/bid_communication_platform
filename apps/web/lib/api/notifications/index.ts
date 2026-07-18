export {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationPreferenceGroupsQuery,
  useNotificationPreferencesQuery,
  useNotificationsInfiniteQuery,
  useNotificationSummaryQuery,
  useUpdateNotificationPreferenceGroupMutation,
  useUpdateNotificationPreferenceMutation,
} from "./hooks";
export type {
  NotificationPreference,
  NotificationPreferenceGroup,
  NotificationPreferenceGroupName,
  NotificationPreferenceUpdate,
  NotificationRecord,
  NotificationSeverity,
  NotificationSummary,
  NotificationType,
} from "./types";
