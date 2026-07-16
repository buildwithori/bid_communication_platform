"use client";

import { useCallback, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toolKeys } from "./keys";
import {
  createToolRequest,
  getToolRequest,
  listToolsRequest,
  updateToolRequest,
} from "./requests";
import type {
  CreateToolPayload,
  ToolQuery,
  ToolRecord,
  UpdateToolVariables,
} from "./types";

type PageQuery = Omit<ToolQuery, "cursor">;
type MutationHandlers<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

export function useToolsPage(query: PageQuery) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: toolKeys.list({ ...query, cursor }),
    queryFn: () => listToolsRequest({ ...query, cursor }),
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
    summary: result.data?.summary,
    setPage,
    resetPagination,
  };
}

export function useLazyToolsQuery({
  enabled,
  ...query
}: PageQuery & { enabled: boolean }) {
  const result = useInfiniteQuery({
    queryKey: toolKeys.list(query),
    queryFn: ({ pageParam }) =>
      listToolsRequest({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
  };
}

export const useToolDetailQuery = (id: string | null) =>
  useQuery({
    queryKey: toolKeys.detail(id ?? "none"),
    queryFn: () => getToolRequest(id as string),
    enabled: Boolean(id),
  });

export function useCreateToolMutation(handlers?: MutationHandlers<ToolRecord>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateToolPayload) => createToolRequest(payload),
    onSuccess: (data) => {
      void client.invalidateQueries({ queryKey: toolKeys.all });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export function useUpdateToolMutation(handlers?: MutationHandlers<ToolRecord>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateToolVariables) =>
      updateToolRequest(id, payload),
    onSuccess: (data) => {
      client.setQueryData(toolKeys.detail(data.id), data);
      void client.invalidateQueries({ queryKey: toolKeys.lists() });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}
