import type { NotificationQuery } from "./types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (query?: Omit<NotificationQuery, "cursor">) =>
    [...notificationKeys.all, "list", query ?? {}] as const,
  summary: () => [...notificationKeys.all, "summary"] as const,
  preferences: () => [...notificationKeys.all, "preferences"] as const,
};
