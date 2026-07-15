'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from './keys';
import { listNotificationsRequest, markAllNotificationsReadRequest, markNotificationReadRequest } from './requests';
import type { NotificationQuery } from './types';

export function useNotificationsQuery(query?: NotificationQuery) {
  return useQuery({
    queryKey: notificationKeys.list(query),
    queryFn: () => listNotificationsRequest(query),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationReadRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsReadRequest(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
