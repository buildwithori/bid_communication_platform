"use client";

import { useCallback, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { settingsKeys } from "./keys";
import {
  createBusinessStageRequest,
  createProgrammeGoalTypeRequest,
  createSectorRequest,
  createToolAreaRequest,
  getCompanySettingsRequest,
  listBusinessStagesRequest,
  listProgrammeGoalTypesRequest,
  listSectorsRequest,
  listToolAreasRequest,
  updateBusinessStageRequest,
  updateCompanySettingsRequest,
  updateProgrammeGoalTypeRequest,
  updateSectorRequest,
  updateToolAreaRequest,
} from "./requests";
import type {
  BusinessStagePayload,
  BusinessStageRecord,
  BusinessStageUpdatePayload,
  CompanyConfig,
  LookupPage,
  LookupPayload,
  LookupQuery,
  LookupRecord,
  LookupUpdatePayload,
  ProgrammeGoalTypePayload,
  ProgrammeGoalTypeRecord,
  ProgrammeGoalTypeUpdatePayload,
  UpdateLookupVariables,
} from "./types";

type MutationHandlers<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

type LazyLookupOptions = Omit<LookupQuery, "cursor"> & {
  enabled: boolean;
};

export function useCompanySettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.company(),
    queryFn: getCompanySettingsRequest,
  });
}

export function useUpdateCompanySettingsMutation(
  handlers?: MutationHandlers<CompanyConfig>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCompanySettingsRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.company(), data);
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

type LookupPageQuery = Omit<LookupQuery, "cursor">;

function useLookupPage<TRecord>(
  query: LookupPageQuery,
  queryKey: (query: LookupQuery) => readonly unknown[],
  request: (query: LookupQuery) => Promise<LookupPage<TRecord>>,
) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: queryKey({ ...query, cursor }),
    queryFn: () => request({ ...query, cursor }),
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
    pageSize: query.take ?? 10,
    totalItems: result.data?.totalItems ?? 0,
    rows: result.data?.items ?? [],
    setPage,
    resetPagination,
  };
}

export function useSectorsPage(query: LookupPageQuery) {
  return useLookupPage(query, settingsKeys.sectorList, listSectorsRequest);
}

export function useBusinessStagesPage(query: LookupPageQuery) {
  return useLookupPage(
    query,
    settingsKeys.businessStageList,
    listBusinessStagesRequest,
  );
}

export function useProgrammeGoalTypesPage(query: LookupPageQuery) {
  return useLookupPage(
    query,
    settingsKeys.programmeGoalTypeList,
    listProgrammeGoalTypesRequest,
  );
}

export function useToolAreasPage(query: LookupPageQuery) {
  return useLookupPage(query, settingsKeys.toolAreaList, listToolAreasRequest);
}

export function useSectorsQuery(query?: LookupQuery) {
  return useQuery({
    queryKey: settingsKeys.sectorList(query),
    queryFn: () => listSectorsRequest(query),
  });
}

export function useBusinessStagesQuery(query?: LookupQuery) {
  return useQuery({
    queryKey: settingsKeys.businessStageList(query),
    queryFn: () => listBusinessStagesRequest(query),
  });
}

export function useProgrammeGoalTypesQuery(query?: LookupQuery) {
  return useQuery({
    queryKey: settingsKeys.programmeGoalTypeList(query),
    queryFn: () => listProgrammeGoalTypesRequest(query),
  });
}

export function useToolAreasQuery(query?: LookupQuery) {
  return useQuery({
    queryKey: settingsKeys.toolAreaList(query),
    queryFn: () => listToolAreasRequest(query),
  });
}

export function useLazySectorsQuery({ enabled, ...query }: LazyLookupOptions) {
  return useInfiniteQuery({
    queryKey: settingsKeys.sectorList(query),
    queryFn: ({ pageParam }) =>
      listSectorsRequest({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

export function useLazyBusinessStagesQuery({
  enabled,
  ...query
}: LazyLookupOptions) {
  return useInfiniteQuery({
    queryKey: settingsKeys.businessStageList(query),
    queryFn: ({ pageParam }) =>
      listBusinessStagesRequest({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

export function useLazyProgrammeGoalTypesQuery({
  enabled,
  ...query
}: LazyLookupOptions) {
  return useInfiniteQuery({
    queryKey: settingsKeys.programmeGoalTypeList(query),
    queryFn: ({ pageParam }) =>
      listProgrammeGoalTypesRequest({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

export function useLazyToolAreasQuery({
  enabled,
  ...query
}: LazyLookupOptions) {
  return useInfiniteQuery({
    queryKey: settingsKeys.toolAreaList(query),
    queryFn: ({ pageParam }) =>
      listToolAreasRequest({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

function useLookupMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKey: readonly unknown[],
  handlers?: MutationHandlers<TData>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export function useCreateSectorMutation(
  handlers?: MutationHandlers<LookupRecord>,
) {
  return useLookupMutation(
    createSectorRequest,
    settingsKeys.sectors(),
    handlers,
  );
}

export function useUpdateSectorMutation(
  handlers?: MutationHandlers<LookupRecord>,
) {
  return useLookupMutation<
    LookupRecord,
    UpdateLookupVariables<LookupUpdatePayload>
  >(updateSectorRequest, settingsKeys.sectors(), handlers);
}

export function useCreateBusinessStageMutation(
  handlers?: MutationHandlers<BusinessStageRecord>,
) {
  return useLookupMutation<BusinessStageRecord, BusinessStagePayload>(
    createBusinessStageRequest,
    settingsKeys.businessStages(),
    handlers,
  );
}

export function useUpdateBusinessStageMutation(
  handlers?: MutationHandlers<BusinessStageRecord>,
) {
  return useLookupMutation<
    BusinessStageRecord,
    UpdateLookupVariables<BusinessStageUpdatePayload>
  >(updateBusinessStageRequest, settingsKeys.businessStages(), handlers);
}

export function useCreateProgrammeGoalTypeMutation(
  handlers?: MutationHandlers<ProgrammeGoalTypeRecord>,
) {
  return useLookupMutation<ProgrammeGoalTypeRecord, ProgrammeGoalTypePayload>(
    createProgrammeGoalTypeRequest,
    settingsKeys.programmeGoalTypes(),
    handlers,
  );
}

export function useUpdateProgrammeGoalTypeMutation(
  handlers?: MutationHandlers<ProgrammeGoalTypeRecord>,
) {
  return useLookupMutation<
    ProgrammeGoalTypeRecord,
    UpdateLookupVariables<ProgrammeGoalTypeUpdatePayload>
  >(
    updateProgrammeGoalTypeRequest,
    settingsKeys.programmeGoalTypes(),
    handlers,
  );
}

export function useCreateToolAreaMutation(
  handlers?: MutationHandlers<LookupRecord>,
) {
  return useLookupMutation<LookupRecord, LookupPayload>(
    createToolAreaRequest,
    settingsKeys.toolAreas(),
    handlers,
  );
}

export function useUpdateToolAreaMutation(
  handlers?: MutationHandlers<LookupRecord>,
) {
  return useLookupMutation<
    LookupRecord,
    UpdateLookupVariables<LookupUpdatePayload>
  >(updateToolAreaRequest, settingsKeys.toolAreas(), handlers);
}
