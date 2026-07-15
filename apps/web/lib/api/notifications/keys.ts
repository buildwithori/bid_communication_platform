import type { NotificationQuery } from './types';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (query?: NotificationQuery) => [...notificationKeys.all, 'list', query ?? {}] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};
