"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { retainPreviousQueryData } from "../query-behavior";
import { toolRequestKeys } from "./keys";
import {
  createToolRequestRequest,
  getToolRequestRequest,
  getToolRequestSummaryRequest,
  listToolRequestsRequest,
  updateToolRequestRequest,
} from "./requests";
import type {
  CreateToolRequestPayload,
  ToolRequestQuery,
  ToolRequestRecord,
  UpdateToolRequestVariables,
} from "./types";

type PageQuery = Omit<ToolRequestQuery, "cursor">;
type MutationHandlers<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

export function useToolRequestsPage(query: PageQuery) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: toolRequestKeys.list({ ...query, cursor }),
    queryFn: () => listToolRequestsRequest({ ...query, cursor }),
    placeholderData: retainPreviousQueryData,
  });

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);

  const setPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage === page) return;
      if (
        nextPage === 1 ||
        (nextPage < page && cursors[nextPage - 1] !== undefined)
      ) {
        setCurrentPage(nextPage);
      } else if (nextPage === page + 1 && result.data?.nextCursor) {
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

export function useToolRequestSummaryQuery() {
  return useQuery({
    queryKey: toolRequestKeys.summary(),
    queryFn: getToolRequestSummaryRequest,
  });
}

export const useToolRequestDetailQuery = (id: string | null) =>
  useQuery({
    queryKey: toolRequestKeys.detail(id ?? "none"),
    queryFn: () => getToolRequestRequest(id as string),
    enabled: Boolean(id),
  });

export function useCreateToolRequestMutation(
  handlers?: MutationHandlers<ToolRequestRecord>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateToolRequestPayload) =>
      createToolRequestRequest(payload),
    onSuccess: (data) => {
      void client.invalidateQueries({ queryKey: toolRequestKeys.all });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export function useUpdateToolRequestMutation(
  handlers?: MutationHandlers<ToolRequestRecord>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateToolRequestVariables) =>
      updateToolRequestRequest(id, payload),
    onSuccess: (data) => {
      client.setQueryData(toolRequestKeys.detail(data.id), data);
      void client.invalidateQueries({ queryKey: toolRequestKeys.all });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}
