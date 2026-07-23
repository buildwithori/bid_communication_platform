"use client";
import { useCallback, useEffect, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { retainPreviousQueryData } from "../query-behavior";
import { sessionKeys } from "./keys";
import {
  acceptSessionRequest,
  addSessionNoteRequest,
  cancelSessionRequest,
  completeSessionRequest,
  createSessionRequest,
  declineSessionRequest,
  getSessionAvailabilityRequest,
  getSessionRequest,
  getSessionSummaryRequest,
  listSessionsRequest,
  listSessionTeamMembersRequest,
  rescheduleSessionRequest,
} from "./requests";
import type {
  CreateSessionPayload,
  SessionAvailabilityQuery,
  SessionCompleteVariables,
  SessionNoteVariables,
  SessionQuery,
  SessionReasonVariables,
  SessionRecord,
  SessionRescheduleVariables,
  SessionTeamMemberQuery,
} from "./types";

type MutationHandlers<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

export function useSessionsPage(query: Omit<SessionQuery, "cursor">) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: sessionKeys.list({ ...query, cursor }),
    queryFn: () => listSessionsRequest({ ...query, cursor }),
    placeholderData: retainPreviousQueryData,
  });
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);
  const setPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage === page) return;
      if (nextPage < page || nextPage === 1) setCurrentPage(nextPage);
      else if (nextPage === page + 1 && result.data?.nextCursor) {
        setCursors((current) => {
          const next = [...current];
          next[nextPage - 1] = result.data?.nextCursor ?? undefined;
          return next;
        });
        setCurrentPage(nextPage);
      }
    },
    [page, result.data?.nextCursor],
  );
  return {
    ...result,
    page,
    rows: result.data?.items ?? [],
    totalItems: result.data?.totalItems ?? 0,
    setPage,
    resetPagination,
  };
}

export function useSessionSummaryQuery() {
  return useQuery({
    queryKey: sessionKeys.summary(),
    queryFn: getSessionSummaryRequest,
  });
}

export function useInfiniteSessionsQuery(
  query: Omit<SessionQuery, "cursor">,
  enabled = true,
) {
  const result = useInfiniteQuery({
    queryKey: sessionKeys.list(query),
    queryFn: ({ pageParam }) =>
      listSessionsRequest({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    placeholderData: retainPreviousQueryData,
  });
  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
  };
}

export function useSessionCalendarWindowQuery(
  query: Omit<SessionQuery, "cursor">,
) {
  const result = useInfiniteSessionsQuery(query);
  const { fetchNextPage, hasNextPage, isError, isFetchingNextPage } = result;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage]);
  return {
    ...result,
    isLoading:
      result.isLoading ||
      isFetchingNextPage ||
      (!isError && Boolean(hasNextPage)),
  };
}

export function useSessionDetailQuery(id: string | null) {
  return useQuery({
    queryKey: sessionKeys.detail(id ?? "none"),
    queryFn: () => getSessionRequest(id as string),
    enabled: Boolean(id),
  });
}

export function useLazySessionTeamMembers(
  query: Omit<SessionTeamMemberQuery, "cursor"> & { enabled: boolean },
) {
  const { enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: sessionKeys.teamMembers(filters),
    queryFn: ({ pageParam }) =>
      listSessionTeamMembersRequest({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
  const isRefreshingOptions =
    enabled && result.isFetching && !result.isFetchingNextPage;
  return {
    ...result,
    isLoading: result.isLoading || isRefreshingOptions,
    rows: isRefreshingOptions
      ? []
      : (result.data?.pages.flatMap((page) => page.items) ?? []),
  };
}

export function useSessionAvailabilityQuery(
  query: SessionAvailabilityQuery,
  enabled: boolean,
) {
  return useQuery({
    queryKey: sessionKeys.availability(query),
    queryFn: () => getSessionAvailabilityRequest(query),
    enabled,
  });
}

function useSessionMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<SessionRecord>,
  handlers?: MutationHandlers<SessionRecord>,
) {
  const queryClient = useQueryClient();
  return useMutation<SessionRecord, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      queryClient.setQueryData(sessionKeys.detail(data.id), data);
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({
        queryKey: [...sessionKeys.all, "availability"],
      });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}
export function useCreateSessionMutation(
  handlers?: MutationHandlers<SessionRecord>,
) {
  return useSessionMutation<CreateSessionPayload>(
    createSessionRequest,
    handlers,
  );
}
export function useAcceptSessionMutation(
  handlers?: MutationHandlers<SessionRecord>,
) {
  return useSessionMutation<string>(acceptSessionRequest, handlers);
}
export function useDeclineSessionMutation(
  handlers?: MutationHandlers<SessionRecord>,
) {
  return useSessionMutation<SessionReasonVariables>(
    declineSessionRequest,
    handlers,
  );
}
export function useCancelSessionMutation(
  handlers?: MutationHandlers<SessionRecord>,
) {
  return useSessionMutation<SessionReasonVariables>(
    cancelSessionRequest,
    handlers,
  );
}
export function useRescheduleSessionMutation(
  handlers?: MutationHandlers<SessionRecord>,
) {
  return useSessionMutation<SessionRescheduleVariables>(
    rescheduleSessionRequest,
    handlers,
  );
}
export function useCompleteSessionMutation(
  handlers?: MutationHandlers<SessionRecord>,
) {
  return useSessionMutation<SessionCompleteVariables>(
    completeSessionRequest,
    handlers,
  );
}
export function useAddSessionNoteMutation(
  handlers?: MutationHandlers<SessionRecord>,
) {
  return useSessionMutation<SessionNoteVariables>(
    addSessionNoteRequest,
    handlers,
  );
}
