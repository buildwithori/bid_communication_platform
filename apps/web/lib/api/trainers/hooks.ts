"use client";

import { useCallback, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { trainerKeys } from "./keys";
import {
  acceptTrainerInvitationRequest,
  getTrainerProfileRequest,
  getTrainerRequest,
  inviteTrainerRequest,
  listTrainersRequest,
  resendTrainerInvitationRequest,
  updateTrainerProfileRequest,
  updateTrainerRequest,
  updateTrainerStatusRequest,
} from "./requests";
import type {
  AcceptTrainerInvitationPayload,
  InvitationResendResult,
  InviteTrainerPayload,
  TrainerPage,
  TrainerProfilePayload,
  TrainerQuery,
  TrainerRecord,
  UpdateTrainerStatusVariables,
  UpdateTrainerVariables,
} from "./types";

type MutationHandlers<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

type TrainerPageQuery = Omit<TrainerQuery, "cursor">;

export function useTrainersPage(query: TrainerPageQuery) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: trainerKeys.list({ ...query, cursor }),
    queryFn: () => listTrainersRequest({ ...query, cursor }),
  });

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);

  const setPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage === page) return;
      if (
        (nextPage < page && cursors[nextPage - 1] !== undefined) ||
        nextPage === 1
      ) {
        setCurrentPage(nextPage);
        return;
      }
      if (nextPage === page + 1 && result.data?.nextCursor) {
        setCursors((current) => {
          const next = [...current];
          next[nextPage - 1] = result.data?.nextCursor ?? undefined;
          return next;
        });
        setCurrentPage(nextPage);
      }
    },
    [cursors, page, result.data?.nextCursor],
  );

  return {
    ...result,
    page,
    rows: result.data?.items ?? [],
    totalItems: result.data?.totalItems ?? 0,
    summary:
      result.data?.summary ??
      ({
        totalTrainers: 0,
        activeTrainers: 0,
        pendingInvites: 0,
        calendarReady: 0,
      } satisfies TrainerPage["summary"]),
    setPage,
    resetPagination,
  };
}

export function useLazyTrainersLookup(
  query: Omit<TrainerQuery, "cursor"> & { enabled: boolean },
) {
  const { enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: trainerKeys.list(filters),
    queryFn: ({ pageParam }) =>
      listTrainersRequest({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
  const isRefreshingOptions =
    enabled && result.isFetching && !result.isFetchingNextPage;
  const rows = isRefreshingOptions
    ? []
    : (result.data?.pages.flatMap((page) => page.items) ?? []).filter(
        (trainer) =>
          trainer.directoryStatus === "active" &&
          (trainer.accessLevel === "full" ||
            Boolean(
              trainer.accessExpiresOn &&
                new Date(trainer.accessExpiresOn) > new Date(),
            )),
      );
  return {
    ...result,
    isLoading: result.isLoading || isRefreshingOptions,
    rows,
  };
}

export function useTrainerDetailQuery(id: string | null) {
  return useQuery({
    queryKey: trainerKeys.detail(id ?? "none"),
    queryFn: () => getTrainerRequest(id as string),
    enabled: Boolean(id),
  });
}

export function useTrainerProfileQuery() {
  return useQuery<TrainerRecord>({
    queryKey: trainerKeys.profile(),
    queryFn: getTrainerProfileRequest,
  });
}

function useTrainerMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  handlers?: MutationHandlers<TData>,
) {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: trainerKeys.all });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export function useInviteTrainerMutation(
  handlers?: MutationHandlers<TrainerRecord>,
) {
  return useTrainerMutation<TrainerRecord, InviteTrainerPayload>(
    inviteTrainerRequest,
    handlers,
  );
}

export function useUpdateTrainerMutation(
  handlers?: MutationHandlers<TrainerRecord>,
) {
  return useTrainerMutation<TrainerRecord, UpdateTrainerVariables>(
    updateTrainerRequest,
    handlers,
  );
}

export function useUpdateTrainerStatusMutation(
  handlers?: MutationHandlers<TrainerRecord>,
) {
  return useTrainerMutation<TrainerRecord, UpdateTrainerStatusVariables>(
    updateTrainerStatusRequest,
    handlers,
  );
}

export function useResendTrainerInvitationMutation(
  handlers?: MutationHandlers<InvitationResendResult>,
) {
  return useTrainerMutation<InvitationResendResult, string>(
    resendTrainerInvitationRequest,
    handlers,
  );
}

export function useUpdateTrainerProfileMutation(
  handlers?: MutationHandlers<TrainerRecord>,
) {
  const queryClient = useQueryClient();
  return useMutation<TrainerRecord, Error, TrainerProfilePayload>({
    mutationFn: updateTrainerProfileRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(trainerKeys.profile(), data);
      void queryClient.invalidateQueries({ queryKey: trainerKeys.lists() });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export function useAcceptTrainerInvitationMutation(
  handlers?: MutationHandlers<TrainerRecord>,
) {
  return useMutation<TrainerRecord, Error, AcceptTrainerInvitationPayload>({
    mutationFn: acceptTrainerInvitationRequest,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });
}
