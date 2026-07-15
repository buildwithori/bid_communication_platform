"use client";

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
