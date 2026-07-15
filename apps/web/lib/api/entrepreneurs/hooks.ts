"use client";

import { useCallback, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listProgrammesRequest } from "../programmes/requests";
import { entrepreneurKeys } from "./keys";
import {
  acceptEntrepreneurInvitationRequest,
  getEntrepreneurProfileRequest,
  getEntrepreneurRequest,
  grantProgrammeAccessRequest,
  grantToolAccessRequest,
  hideToolAccessRequest,
  inviteEntrepreneurRequest,
  listEntrepreneursRequest,
  listEffectiveToolsRequest,
  listFundraisingRoundsRequest,
  listPeriodicUpdatesRequest,
  listProgrammeAccessRequest,
  listProgrammeGoalsRequest,
  resendEntrepreneurInvitationRequest,
  restoreToolAccessRequest,
  revokeProgrammeAccessRequest,
  revokeToolAccessRequest,
  saveFundraisingRoundRequest,
  savePeriodicUpdateRequest,
  saveProgrammeGoalRequest,
  updateEntrepreneurProfileRequest,
  updateEntrepreneurRequest,
  updateEntrepreneurStatusRequest,
} from "./requests";
import type {
  AcceptEntrepreneurInvitationPayload,
  CursorPage,
  EffectiveToolQuery,
  EntrepreneurPage,
  EntrepreneurProfilePayload,
  EntrepreneurQuery,
  EntrepreneurRecord,
  FundraisingRoundPayload,
  FundraisingRoundRecord,
  InvitationResendResult,
  InviteEntrepreneurPayload,
  PeriodicUpdatePayload,
  PeriodicUpdateRecord,
  ProfileRecordQuery,
  ProgrammeAccessQuery,
  ProgrammeAccessVariables,
  ProgrammeGoalPayload,
  ProgrammeGoalRecord,
  RecordMutationVariables,
  ToolAccessVariables,
  UpdateEntrepreneurStatusVariables,
  UpdateEntrepreneurVariables,
} from "./types";

type MutationHandlers<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

type PageQuery = Omit<EntrepreneurQuery, "cursor">;

export function useLazyGrantableProgrammesQuery({
  enabled,
  search,
  take = 20,
}: {
  enabled: boolean;
  search?: string;
  take?: number;
}) {
  const result = useInfiniteQuery({
    queryKey: [
      ...entrepreneurKeys.all,
      "grantable-programmes",
      { search, take },
    ],
    queryFn: ({ pageParam }) =>
      listProgrammesRequest({
        search,
        accessType: "assigned",
        grantableOnly: true,
        take,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
  };
}

export function useEntrepreneursPage(query: PageQuery) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: entrepreneurKeys.list({ ...query, cursor }),
    queryFn: () => listEntrepreneursRequest({ ...query, cursor }),
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
        totalEntrepreneurs: 0,
        activeEntrepreneurs: 0,
        unassignedEntrepreneurs: 0,
        withProgrammes: 0,
      } satisfies EntrepreneurPage["summary"]),
    setPage,
    resetPagination,
  };
}

export function useLazyEntrepreneursLookup(
  query: Omit<EntrepreneurQuery, "cursor"> & { enabled: boolean },
) {
  const { enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: entrepreneurKeys.list(filters),
    queryFn: ({ pageParam }) =>
      listEntrepreneursRequest({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
  };
}

export function useEntrepreneurDetailQuery(id: string | null) {
  return useQuery({
    queryKey: entrepreneurKeys.detail(id ?? "none"),
    queryFn: () => getEntrepreneurRequest(id as string),
    enabled: Boolean(id),
  });
}

export function useEntrepreneurProfileQuery() {
  return useQuery<EntrepreneurRecord>({
    queryKey: entrepreneurKeys.profile(),
    queryFn: getEntrepreneurProfileRequest,
  });
}

function useInfiniteResource<T>(
  id: string | null,
  query: Omit<ProfileRecordQuery, "cursor">,
  key: (id: string, query?: ProfileRecordQuery) => readonly unknown[],
  request: (id: string, query?: ProfileRecordQuery) => Promise<CursorPage<T>>,
  enabled = true,
) {
  const result = useInfiniteQuery({
    queryKey: key(id ?? "none", query),
    queryFn: ({ pageParam }) =>
      request(id as string, { ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(id) && enabled,
  });
  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
    totalItems: result.data?.pages[0]?.totalItems ?? 0,
  };
}

export function useProgrammeGoalsQuery(
  id: string | null,
  query: Omit<ProfileRecordQuery, "cursor"> = {},
  enabled = true,
) {
  return useInfiniteResource(
    id,
    query,
    entrepreneurKeys.goals,
    listProgrammeGoalsRequest,
    enabled,
  );
}

export function useFundraisingRoundsQuery(
  id: string | null,
  query: Omit<ProfileRecordQuery, "cursor"> = {},
  enabled = true,
) {
  return useInfiniteResource(
    id,
    query,
    entrepreneurKeys.rounds,
    listFundraisingRoundsRequest,
    enabled,
  );
}

export function usePeriodicUpdatesQuery(
  id: string | null,
  query: Omit<ProfileRecordQuery, "cursor"> = {},
  enabled = true,
) {
  return useInfiniteResource(
    id,
    query,
    entrepreneurKeys.updates,
    listPeriodicUpdatesRequest,
    enabled,
  );
}

export function useProgrammeAccessQuery(
  id: string | null,
  query: Omit<ProgrammeAccessQuery, "cursor"> = {},
  enabled = true,
) {
  const result = useInfiniteQuery({
    queryKey: entrepreneurKeys.access(id ?? "none", query),
    queryFn: ({ pageParam }) =>
      listProgrammeAccessRequest(id as string, { ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(id) && enabled,
  });
  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
    totalItems: result.data?.pages[0]?.totalItems ?? 0,
  };
}

export function useEffectiveToolsQuery(
  id: string | null,
  query: Omit<EffectiveToolQuery, "cursor"> = {},
) {
  const result = useInfiniteQuery({
    queryKey: entrepreneurKeys.tools(id ?? "none", query),
    queryFn: ({ pageParam }) =>
      listEffectiveToolsRequest(id as string, { ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(id),
  });
  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
    totalItems: result.data?.pages[0]?.totalItems ?? 0,
  };
}

function useEntrepreneurMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  handlers?: MutationHandlers<TData>,
) {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: entrepreneurKeys.all });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export const useInviteEntrepreneurMutation = (
  handlers?: MutationHandlers<EntrepreneurRecord>,
) =>
  useEntrepreneurMutation<EntrepreneurRecord, InviteEntrepreneurPayload>(
    inviteEntrepreneurRequest,
    handlers,
  );
export const useUpdateEntrepreneurMutation = (
  handlers?: MutationHandlers<EntrepreneurRecord>,
) =>
  useEntrepreneurMutation<EntrepreneurRecord, UpdateEntrepreneurVariables>(
    updateEntrepreneurRequest,
    handlers,
  );
export const useUpdateEntrepreneurStatusMutation = (
  handlers?: MutationHandlers<EntrepreneurRecord>,
) =>
  useEntrepreneurMutation<
    EntrepreneurRecord,
    UpdateEntrepreneurStatusVariables
  >(updateEntrepreneurStatusRequest, handlers);
export const useResendEntrepreneurInvitationMutation = (
  handlers?: MutationHandlers<InvitationResendResult>,
) =>
  useEntrepreneurMutation<InvitationResendResult, string>(
    resendEntrepreneurInvitationRequest,
    handlers,
  );
export const useGrantProgrammeAccessMutation = (
  handlers?: MutationHandlers<EntrepreneurRecord>,
) =>
  useEntrepreneurMutation<EntrepreneurRecord, ProgrammeAccessVariables>(
    grantProgrammeAccessRequest,
    handlers,
  );
export const useRevokeProgrammeAccessMutation = (
  handlers?: MutationHandlers<EntrepreneurRecord>,
) =>
  useEntrepreneurMutation<EntrepreneurRecord, ProgrammeAccessVariables>(
    revokeProgrammeAccessRequest,
    handlers,
  );
export const useGrantToolAccessMutation = (
  handlers?: MutationHandlers<{ ok: boolean }>,
) =>
  useEntrepreneurMutation<{ ok: boolean }, ToolAccessVariables>(
    grantToolAccessRequest,
    handlers,
  );
export const useRevokeToolAccessMutation = (
  handlers?: MutationHandlers<{ ok: boolean }>,
) =>
  useEntrepreneurMutation<{ ok: boolean }, ToolAccessVariables>(
    revokeToolAccessRequest,
    handlers,
  );
export const useHideToolAccessMutation = (
  handlers?: MutationHandlers<{ ok: boolean }>,
) =>
  useEntrepreneurMutation<{ ok: boolean }, ToolAccessVariables>(
    hideToolAccessRequest,
    handlers,
  );
export const useRestoreToolAccessMutation = (
  handlers?: MutationHandlers<{ ok: boolean }>,
) =>
  useEntrepreneurMutation<{ ok: boolean }, ToolAccessVariables>(
    restoreToolAccessRequest,
    handlers,
  );

export function useUpdateEntrepreneurProfileMutation(
  handlers?: MutationHandlers<EntrepreneurRecord>,
) {
  const queryClient = useQueryClient();
  return useMutation<EntrepreneurRecord, Error, EntrepreneurProfilePayload>({
    mutationFn: updateEntrepreneurProfileRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(entrepreneurKeys.profile(), data);
      void queryClient.invalidateQueries({
        queryKey: entrepreneurKeys.lists(),
      });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export const useSaveProgrammeGoalMutation = (
  handlers?: MutationHandlers<ProgrammeGoalRecord>,
) =>
  useEntrepreneurMutation<
    ProgrammeGoalRecord,
    RecordMutationVariables<ProgrammeGoalPayload>
  >(saveProgrammeGoalRequest, handlers);
export const useSaveFundraisingRoundMutation = (
  handlers?: MutationHandlers<FundraisingRoundRecord>,
) =>
  useEntrepreneurMutation<
    FundraisingRoundRecord,
    RecordMutationVariables<FundraisingRoundPayload>
  >(saveFundraisingRoundRequest, handlers);
export const useSavePeriodicUpdateMutation = (
  handlers?: MutationHandlers<PeriodicUpdateRecord>,
) =>
  useEntrepreneurMutation<
    PeriodicUpdateRecord,
    RecordMutationVariables<PeriodicUpdatePayload>
  >(savePeriodicUpdateRequest, handlers);

export function useAcceptEntrepreneurInvitationMutation(
  handlers?: MutationHandlers<EntrepreneurRecord>,
) {
  return useMutation<
    EntrepreneurRecord,
    Error,
    AcceptEntrepreneurInvitationPayload
  >({
    mutationFn: acceptEntrepreneurInvitationRequest,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });
}
