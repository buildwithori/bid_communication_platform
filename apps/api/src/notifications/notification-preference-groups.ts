import { NotificationType, UserRole } from "@prisma/client";

export const notificationPreferenceGroupNames = [
  "sessions",
  "deliverables",
  "tools",
  "coaching",
  "product",
] as const;

export type NotificationPreferenceGroupName =
  (typeof notificationPreferenceGroupNames)[number];

type PreferenceDefinition = {
  group: NotificationPreferenceGroupName;
  roles: readonly UserRole[];
};

const allRoles = [
  UserRole.admin,
  UserRole.trainer,
  UserRole.entrepreneur,
] as const;

const preferenceDefinitionByType: Record<
  NotificationType,
  PreferenceDefinition
> = {
  [NotificationType.session_request]: {
    group: "sessions",
    roles: [UserRole.admin, UserRole.trainer],
  },
  [NotificationType.session_confirmed]: {
    group: "sessions",
    roles: [UserRole.entrepreneur],
  },
  [NotificationType.session_rescheduled]: {
    group: "sessions",
    roles: [UserRole.entrepreneur],
  },
  [NotificationType.session_declined]: {
    group: "sessions",
    roles: [UserRole.entrepreneur],
  },
  [NotificationType.session_cancelled]: {
    group: "sessions",
    roles: [UserRole.entrepreneur],
  },
  [NotificationType.session_completed]: {
    group: "sessions",
    roles: [UserRole.entrepreneur],
  },
  [NotificationType.deliverable_review]: {
    group: "deliverables",
    roles: allRoles,
  },
  [NotificationType.deliverable_changes_requested]: {
    group: "deliverables",
    roles: [UserRole.entrepreneur],
  },
  [NotificationType.tool_request_updated]: {
    group: "tools",
    roles: [UserRole.admin, UserRole.entrepreneur],
  },
  [NotificationType.trainer_nudge]: {
    group: "coaching",
    roles: [UserRole.trainer],
  },
  [NotificationType.system]: {
    group: "product",
    roles: allRoles,
  },
};

export function notificationPreferenceGroupsForRole(role: UserRole) {
  return notificationPreferenceGroupNames.flatMap((group) => {
    const types = Object.values(NotificationType).filter((type) => {
      const definition = preferenceDefinitionByType[type];
      return definition.group === group && definition.roles.includes(role);
    });
    return types.length ? [{ group, types }] : [];
  });
}

export function isNotificationPreferenceGroupName(
  value: string,
): value is NotificationPreferenceGroupName {
  return notificationPreferenceGroupNames.includes(
    value as NotificationPreferenceGroupName,
  );
}
