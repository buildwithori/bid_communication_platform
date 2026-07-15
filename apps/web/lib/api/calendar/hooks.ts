"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarKeys } from "./keys";
import {
  createCalendarAuthorizationRequest,
  disconnectCalendarRequest,
  getCalendarConnectionRequest,
} from "./requests";
import type {
  CalendarAuthorization,
  CalendarConnection,
} from "./types";

type MutationHandlers<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

export function useCalendarConnectionQuery() {
  return useQuery({
    queryKey: calendarKeys.connection(),
    queryFn: getCalendarConnectionRequest,
  });
}

export function useCalendarAuthorizationMutation(
  handlers?: MutationHandlers<CalendarAuthorization>,
) {
  return useMutation<CalendarAuthorization, Error, void>({
    mutationFn: createCalendarAuthorizationRequest,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });
}

export function useDisconnectCalendarMutation(
  handlers?: MutationHandlers<CalendarConnection>,
) {
  const queryClient = useQueryClient();
  return useMutation<CalendarConnection, Error, void>({
    mutationFn: disconnectCalendarRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(calendarKeys.connection(), data);
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}
