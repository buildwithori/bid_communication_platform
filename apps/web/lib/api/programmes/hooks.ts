'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retainPreviousQueryData } from '../query-behavior';
import { programmeKeys } from './keys';
import { dashboardKeys } from '../dashboards/keys';
import { deliverableKeys } from '../deliverables/keys';
import { notificationKeys } from '../notifications/keys';
import {
  archiveProgrammeRequest,
  createProgrammeDeliverableRuleRequest,
  createProgrammeModuleRequest,
  createProgrammeRequest,
  deleteProgrammeDeliverableRuleRequest,
  deleteProgrammeModuleRequest,
  deleteProgrammeRequest,
  getProgrammeModuleRequest,
  getProgrammePlayerRequest,
  getProgrammeRequest,
  getProgrammeSummaryRequest,
  listProgrammeDeliverableRulesRequest,
  listProgrammeModulesRequest,
  listProgrammesRequest,
  listReusableProgrammeModulesRequest,
  moveProgrammeModuleRequest,
  publishProgrammeRequest,
  restoreProgrammeRequest,
  reuseProgrammeModuleRequest,
  updateProgrammeDeliverableRuleRequest,
  updateProgrammeModuleRequest,
  updateProgrammeRequest,
} from './requests';
import type {
  ArchiveProgrammeVariables,
  CreateProgrammeDeliverableRuleVariables,
  CreateProgrammeModuleVariables,
  CreateProgrammePayload,
  DeleteProgrammeModuleVariables,
  DeleteProgrammeDeliverableRuleVariables,
  DeleteProgrammeVariables,
  MoveProgrammeModuleVariables,
  ProgrammeDeliverableRule,
  ProgrammeDeliverableRuleQuery,
  ProgrammeDetail,
  ProgrammeModuleQuery,
  ProgrammeModulePage,
  ProgrammeModuleRecord,
  ProgrammeQuery,
  ResourceDeletionResult,
  ReuseProgrammeModuleVariables,
  UpdateProgrammeDeliverableRuleVariables,
  UpdateProgrammeModuleVariables,
  UpdateProgrammeVariables,
} from './types';

type MutationHandlers<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

type ProgrammePageQuery = Omit<ProgrammeQuery, 'cursor'>;
type ProgrammeModulePageQuery = Omit<ProgrammeModuleQuery, 'cursor'>;

export function useProgrammesPage(query: ProgrammePageQuery) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: programmeKeys.list({ ...query, cursor }),
    queryFn: () => listProgrammesRequest({ ...query, cursor }),
    placeholderData: retainPreviousQueryData,
  });

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);

  const setPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage === page) return;
      if ((nextPage < page && cursors[nextPage - 1] !== undefined) || nextPage === 1) {
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
    setPage,
    resetPagination,
  };
}

export function useLazyProgrammesLookup(query: ProgrammePageQuery & { enabled: boolean }) {
  const { enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: programmeKeys.list(filters),
    queryFn: ({ pageParam }) => listProgrammesRequest({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });

  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
  };
}

export const useProgrammeSummaryQuery = () =>
  useQuery({
    queryKey: programmeKeys.summary(),
    queryFn: getProgrammeSummaryRequest,
  });

export const useProgrammeDetailQuery = (id: string | null) =>
  useQuery({
    queryKey: programmeKeys.detail(id ?? 'none'),
    queryFn: () => getProgrammeRequest(id as string),
    enabled: Boolean(id),
  });

export const useProgrammePlayerQuery = (id: string | null, enabled = true) =>
  useQuery({
    queryKey: programmeKeys.player(id ?? 'none'),
    queryFn: () => getProgrammePlayerRequest(id as string),
    enabled: enabled && Boolean(id),
  });

export const useProgrammeModuleDetailQuery = (programmeId: string | null, moduleId: string | null) =>
  useQuery({
    queryKey: programmeKeys.moduleDetail(programmeId ?? 'none', moduleId ?? 'none'),
    queryFn: () => getProgrammeModuleRequest(programmeId as string, moduleId as string),
    enabled: Boolean(programmeId && moduleId),
  });

export function useProgrammeModulesPage(programmeId: string, query: ProgrammeModulePageQuery) {
  const queryClient = useQueryClient();
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: programmeKeys.moduleList(programmeId, { ...query, cursor }),
    queryFn: () => listProgrammeModulesRequest(programmeId, { ...query, cursor }),
    placeholderData: retainPreviousQueryData,
    enabled: Boolean(programmeId),
    refetchInterval: (current) =>
      current.state.data?.items.some(
        (module) => module.processingContentCount > 0,
      )
        ? 5_000
        : false,
  });
  const rows: ProgrammeModuleRecord[] = result.data?.items ?? [];
  const lifecycleSignature = rows
    .map(
      (module) =>
        `${module.id}:${module.content.total}:${module.processingContentCount}:${module.readiness}`,
    )
    .join('|');
  const previousLifecycleSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!result.data) return;
    const previous = previousLifecycleSignature.current;
    previousLifecycleSignature.current = lifecycleSignature;
    if (previous === null || previous === lifecycleSignature) return;
    void queryClient.invalidateQueries({
      queryKey: programmeKeys.detail(programmeId),
      exact: true,
    });
    void queryClient.invalidateQueries({ queryKey: programmeKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: programmeKeys.summary() });
    void queryClient.invalidateQueries({
      queryKey: programmeKeys.player(programmeId),
    });
  }, [lifecycleSignature, programmeId, queryClient, result.data]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);

  const setPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage === page) return;
      if ((nextPage < page && cursors[nextPage - 1] !== undefined) || nextPage === 1) {
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
    rows,
    totalItems: result.data?.totalItems ?? 0,
    setPage,
    resetPagination,
  };
}

export function useLazyProgrammeModules(
  query: ProgrammeModulePageQuery & {
    programmeId: string;
    enabled: boolean;
  },
) {
  const { programmeId, enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: programmeKeys.moduleList(programmeId, filters),
    queryFn: ({ pageParam }) =>
      listProgrammeModulesRequest(programmeId, {
        ...filters,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && Boolean(programmeId),
  });

  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
  };
}

export function useLazyReusableProgrammeModules(
  query: ProgrammeModulePageQuery & {
    programmeId: string;
    enabled: boolean;
  },
) {
  const { programmeId, enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: programmeKeys.reusableModules(programmeId, filters),
    queryFn: ({ pageParam }) =>
      listReusableProgrammeModulesRequest(programmeId, {
        ...filters,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && Boolean(programmeId),
  });

  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
  };
}

export function useProgrammeDeliverableRulesPage(programmeId: string, query: Omit<ProgrammeDeliverableRuleQuery, 'cursor'>) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: programmeKeys.deliverableRules(programmeId, { ...query, cursor }),
    queryFn: () => listProgrammeDeliverableRulesRequest(programmeId, { ...query, cursor }),
    placeholderData: retainPreviousQueryData,
    enabled: Boolean(programmeId),
  });

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);

  const setPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage === page) return;
      if ((nextPage < page && cursors[nextPage - 1] !== undefined) || nextPage === 1) {
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
    setPage,
    resetPagination,
  };
}

function useProgrammeMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<ProgrammeDetail>, handlers?: MutationHandlers<ProgrammeDetail>) {
  const queryClient = useQueryClient();
  return useMutation<ProgrammeDetail, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      queryClient.setQueryData(programmeKeys.detail(data.id), data);
      void queryClient.invalidateQueries({ queryKey: programmeKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: programmeKeys.summary() });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export const useCreateProgrammeMutation = (handlers?: MutationHandlers<ProgrammeDetail>) => useProgrammeMutation<CreateProgrammePayload>(createProgrammeRequest, handlers);

export const useUpdateProgrammeMutation = (handlers?: MutationHandlers<ProgrammeDetail>) => useProgrammeMutation<UpdateProgrammeVariables>(updateProgrammeRequest, handlers);

export const usePublishProgrammeMutation = (handlers?: MutationHandlers<ProgrammeDetail>) => useProgrammeMutation<string>(publishProgrammeRequest, handlers);

export const useArchiveProgrammeMutation = (handlers?: MutationHandlers<ProgrammeDetail>) => useProgrammeMutation<ArchiveProgrammeVariables>(archiveProgrammeRequest, handlers);

export const useRestoreProgrammeMutation = (handlers?: MutationHandlers<ProgrammeDetail>) => useProgrammeMutation<string>(restoreProgrammeRequest, handlers);

export const useDeleteProgrammeMutation = (handlers?: MutationHandlers<ResourceDeletionResult>) => {
  const queryClient = useQueryClient();
  return useMutation<ResourceDeletionResult, Error, DeleteProgrammeVariables>({
    mutationFn: deleteProgrammeRequest,
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: programmeKeys.detail(data.id) });
      void queryClient.invalidateQueries({ queryKey: programmeKeys.all });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
};

function useProgrammeModuleMutation<TVariables extends { programmeId: string }>(
  mutationFn: (variables: TVariables) => Promise<ProgrammeModuleRecord>,
  handlers?: MutationHandlers<ProgrammeModuleRecord>,
) {
  const queryClient = useQueryClient();
  return useMutation<ProgrammeModuleRecord, Error, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: programmeKeys.modules(variables.programmeId),
      });
      void queryClient.invalidateQueries({
        queryKey: programmeKeys.reusableModuleLists(variables.programmeId),
      });
      void queryClient.invalidateQueries({
        queryKey: programmeKeys.detail(variables.programmeId),
      });
      void queryClient.invalidateQueries({ queryKey: programmeKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: programmeKeys.summary() });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export const useCreateProgrammeModuleMutation = (handlers?: MutationHandlers<ProgrammeModuleRecord>) =>
  useProgrammeModuleMutation<CreateProgrammeModuleVariables>(createProgrammeModuleRequest, handlers);

export const useUpdateProgrammeModuleMutation = (handlers?: MutationHandlers<ProgrammeModuleRecord>) =>
  useProgrammeModuleMutation<UpdateProgrammeModuleVariables>(updateProgrammeModuleRequest, handlers);

export const useReuseProgrammeModuleMutation = (handlers?: MutationHandlers<ProgrammeModuleRecord>) => useProgrammeModuleMutation<ReuseProgrammeModuleVariables>(reuseProgrammeModuleRequest, handlers);

export const useMoveProgrammeModuleMutation = (
  handlers?: MutationHandlers<ProgrammeModuleRecord>,
) => {
  const queryClient = useQueryClient();
  return useMutation<
    ProgrammeModuleRecord,
    Error,
    MoveProgrammeModuleVariables,
    { snapshots: Array<[readonly unknown[], ProgrammeModulePage | undefined]> }
  >({
    mutationFn: moveProgrammeModuleRequest,
    onMutate: async (variables) => {
      const queryKey = programmeKeys.modules(variables.programmeId);
      const cancellation = queryClient.cancelQueries({ queryKey });
      const snapshots = queryClient.getQueriesData<ProgrammeModulePage>({
        queryKey,
      });

      queryClient.setQueriesData<ProgrammeModulePage>(
        { queryKey },
        (page: ProgrammeModulePage | undefined) =>
          reorderProgrammeModulePage(page, variables),
      );
      await cancellation;
      return { snapshots };
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      handlers?.onError?.(error);
    },
    onSuccess: (data) => handlers?.onSuccess?.(data),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: programmeKeys.modules(variables.programmeId),
      });
      void queryClient.invalidateQueries({
        queryKey: programmeKeys.reusableModuleLists(variables.programmeId),
      });
      void queryClient.invalidateQueries({
        queryKey: programmeKeys.detail(variables.programmeId),
      });
      void queryClient.invalidateQueries({ queryKey: programmeKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: programmeKeys.summary() });
    },
  });
};

function reorderProgrammeModulePage(
  page: ProgrammeModulePage | undefined,
  variables: MoveProgrammeModuleVariables,
) {
  if (!page) return page;
  const ordered = [...page.items].sort(
    (left, right) => left.position - right.position,
  );
  const sourceIndex = ordered.findIndex(
    (item) => item.id === variables.moduleId,
  );
  const targetIndex = ordered.findIndex(
    (item) => item.position === variables.position,
  );
  if (sourceIndex < 0 || targetIndex < 0) return page;

  const positions = ordered.map((item) => item.position);
  const [moved] = ordered.splice(sourceIndex, 1);
  if (!moved) return page;
  ordered.splice(targetIndex, 0, moved);

  return {
    ...page,
    items: ordered.map((item, index) => ({
      ...item,
      position: positions[index] ?? item.position,
    })),
  };
}

export const useDeleteProgrammeModuleMutation = (handlers?: MutationHandlers<ResourceDeletionResult>) => {
  const queryClient = useQueryClient();
  return useMutation<ResourceDeletionResult, Error, DeleteProgrammeModuleVariables>({
    mutationFn: deleteProgrammeModuleRequest,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: programmeKeys.all });
      void queryClient.invalidateQueries({ queryKey: programmeKeys.modules(variables.programmeId) });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
};

function useDeliverableRuleMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<ProgrammeDeliverableRule>, handlers?: MutationHandlers<ProgrammeDeliverableRule>) {
  const queryClient = useQueryClient();
  return useMutation<ProgrammeDeliverableRule, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: programmeKeys.deliverableRuleLists(data.programmeId),
      });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export const useCreateProgrammeDeliverableRuleMutation = (handlers?: MutationHandlers<ProgrammeDeliverableRule>) =>
  useDeliverableRuleMutation<CreateProgrammeDeliverableRuleVariables>(createProgrammeDeliverableRuleRequest, handlers);

export const useUpdateProgrammeDeliverableRuleMutation = (handlers?: MutationHandlers<ProgrammeDeliverableRule>) =>
  useDeliverableRuleMutation<UpdateProgrammeDeliverableRuleVariables>(updateProgrammeDeliverableRuleRequest, handlers);

export const useDeleteProgrammeDeliverableRuleMutation = (handlers?: MutationHandlers<ResourceDeletionResult>) => {
  const queryClient = useQueryClient();
  return useMutation<ResourceDeletionResult, Error, DeleteProgrammeDeliverableRuleVariables>({
    mutationFn: deleteProgrammeDeliverableRuleRequest,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: programmeKeys.deliverableRuleLists(variables.programmeId),
      });
      void queryClient.invalidateQueries({ queryKey: deliverableKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
};
