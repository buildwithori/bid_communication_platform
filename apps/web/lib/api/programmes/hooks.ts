"use client";

import { useCallback, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { programmeKeys } from "./keys";
import {
  archiveProgrammeRequest,
  createProgrammeDeliverableRuleRequest,
  createProgrammeRequest,
  getProgrammeRequest,
  getProgrammeSummaryRequest,
  listProgrammeDeliverableRulesRequest,
  listProgrammesRequest,
  publishProgrammeRequest,
  restoreProgrammeRequest,
  updateProgrammeDeliverableRuleRequest,
  updateProgrammeRequest,
} from "./requests";
import type {
  ArchiveProgrammeVariables,
  CreateProgrammeDeliverableRuleVariables,
  CreateProgrammePayload,
  ProgrammeDeliverableRule,
  ProgrammeDetail,
  ProgrammeQuery,
  UpdateProgrammeDeliverableRuleVariables,
  UpdateProgrammeVariables,
} from "./types";

type MutationHandlers<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

type ProgrammePageQuery = Omit<ProgrammeQuery, "cursor">;

export function useProgrammesPage(query: ProgrammePageQuery) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: programmeKeys.list({ ...query, cursor }),
    queryFn: () => listProgrammesRequest({ ...query, cursor }),
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
    setPage,
    resetPagination,
  };
}

export function useLazyProgrammesLookup(
  query: ProgrammePageQuery & { enabled: boolean },
) {
  const { enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: programmeKeys.list(filters),
    queryFn: ({ pageParam }) =>
      listProgrammesRequest({ ...filters, cursor: pageParam }),
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
    queryKey: programmeKeys.detail(id ?? "none"),
    queryFn: () => getProgrammeRequest(id as string),
    enabled: Boolean(id),
  });

export const useProgrammeDeliverableRulesQuery = (
  programmeId: string | null,
) =>
  useQuery({
    queryKey: programmeKeys.deliverableRules(programmeId ?? "none"),
    queryFn: () =>
      listProgrammeDeliverableRulesRequest(programmeId as string),
    enabled: Boolean(programmeId),
  });

function useProgrammeMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<ProgrammeDetail>,
  handlers?: MutationHandlers<ProgrammeDetail>,
) {
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

export const useCreateProgrammeMutation = (
  handlers?: MutationHandlers<ProgrammeDetail>,
) =>
  useProgrammeMutation<CreateProgrammePayload>(
    createProgrammeRequest,
    handlers,
  );

export const useUpdateProgrammeMutation = (
  handlers?: MutationHandlers<ProgrammeDetail>,
) =>
  useProgrammeMutation<UpdateProgrammeVariables>(
    updateProgrammeRequest,
    handlers,
  );

export const usePublishProgrammeMutation = (
  handlers?: MutationHandlers<ProgrammeDetail>,
) => useProgrammeMutation<string>(publishProgrammeRequest, handlers);

export const useArchiveProgrammeMutation = (
  handlers?: MutationHandlers<ProgrammeDetail>,
) =>
  useProgrammeMutation<ArchiveProgrammeVariables>(
    archiveProgrammeRequest,
    handlers,
  );

export const useRestoreProgrammeMutation = (
  handlers?: MutationHandlers<ProgrammeDetail>,
) => useProgrammeMutation<string>(restoreProgrammeRequest, handlers);

function useDeliverableRuleMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<ProgrammeDeliverableRule>,
  handlers?: MutationHandlers<ProgrammeDeliverableRule>,
) {
  const queryClient = useQueryClient();
  return useMutation<ProgrammeDeliverableRule, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: programmeKeys.deliverableRules(data.programmeId),
      });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export const useCreateProgrammeDeliverableRuleMutation = (
  handlers?: MutationHandlers<ProgrammeDeliverableRule>,
) =>
  useDeliverableRuleMutation<CreateProgrammeDeliverableRuleVariables>(
    createProgrammeDeliverableRuleRequest,
    handlers,
  );

export const useUpdateProgrammeDeliverableRuleMutation = (
  handlers?: MutationHandlers<ProgrammeDeliverableRule>,
) =>
  useDeliverableRuleMutation<UpdateProgrammeDeliverableRuleVariables>(
    updateProgrammeDeliverableRuleRequest,
    handlers,
  );
