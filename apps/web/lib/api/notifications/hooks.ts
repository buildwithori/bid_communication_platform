'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from './keys';
import {
  listNotificationPreferencesRequest,
  listNotificationsRequest,
  notificationSummaryRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
  updateNotificationPreferenceRequest,
} from './requests';
import type { NotificationQuery, NotificationType } from './types';

export function useNotificationsInfiniteQuery(query?: Omit<NotificationQuery, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(query),
    queryFn: ({ pageParam }) => listNotificationsRequest({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 60_000,
  });
}

export function useNotificationSummaryQuery() {
  return useQuery({
    queryKey: notificationKeys.summary(),
    queryFn: notificationSummaryRequest,
    refetchInterval: 60_000,
  });
}

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: listNotificationPreferencesRequest,
  });
}

export function useUpdateNotificationPreferenceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      payload,
    }: {
      type: NotificationType;
      payload: { inAppEnabled?: boolean; emailEnabled?: boolean };
    }) => updateNotificationPreferenceRequest(type, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
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
