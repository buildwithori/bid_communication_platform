"use client";

import { useCallback, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deliverableKeys } from "./keys";
import {
  listDeliverableFeedbackRequest,
  listDeliverableGroupsRequest,
  listDeliverableInstancesRequest,
  listDeliverableReviewQueueRequest,
  listDeliverableSubmissionsRequest,
  markDeliverableReviewReadRequest,
  reviewDeliverableRequest,
  submitDeliverableRequest,
  updateDeliverableDueDateRequest,
} from "./requests";
import type {
  DeliverableGroupQuery,
  DeliverableInstance,
  DeliverableQuery,
  DeliverableReview,
  ReviewDeliverableVariables,
  SubmitDeliverableVariables,
  UpdateDeliverableDueDateVariables,
} from "./types";

type MutationHandlers<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};
type GroupPageQuery = Omit<DeliverableGroupQuery, "cursor">;

export function useLazyDeliverableGroups(
  query: GroupPageQuery & { enabled: boolean },
) {
  const { enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: deliverableKeys.groupList(filters),
    queryFn: ({ pageParam }) => listDeliverableGroupsRequest({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
  return { ...result, rows: result.data?.pages.flatMap((page) => page.items) ?? [] };
}

export function useDeliverableGroupsPage(query: GroupPageQuery) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: deliverableKeys.groupList({ ...query, cursor }),
    queryFn: () => listDeliverableGroupsRequest({ ...query, cursor }),
  });
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);
  const setPage = useCallback((nextPage: number) => {
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
  }, [cursors, page, result.data?.nextCursor]);
  return { ...result, page, rows: result.data?.items ?? [], totalItems: result.data?.totalItems ?? 0, summary: result.data?.summary, unreadFeedbackTotal: result.data?.unreadFeedbackTotal ?? 0, setPage, resetPagination };
}

type PageQuery = Omit<DeliverableQuery, "cursor">;

export function useLazyDeliverableInstances(
  query: PageQuery & { enabled: boolean },
) {
  const { enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: deliverableKeys.instanceList(filters),
    queryFn: ({ pageParam }) =>
      listDeliverableInstancesRequest({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
    totalItems: result.data?.pages[0]?.totalItems ?? 0,
  };
}

export function useDeliverableInstancesPage(query: PageQuery) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: deliverableKeys.instanceList({ ...query, cursor }),
    queryFn: () => listDeliverableInstancesRequest({ ...query, cursor }),
  });
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);
  const setPage = useCallback((nextPage: number) => {
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
  }, [cursors, page, result.data?.nextCursor]);
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

export function useDeliverableReviewQueuePage(query: PageQuery) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: deliverableKeys.reviewQueue({ ...query, cursor }),
    queryFn: () => listDeliverableReviewQueueRequest({ ...query, cursor }),
  });
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);
  const setPage = useCallback((nextPage: number) => {
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
  }, [cursors, page, result.data?.nextCursor]);
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

export const useDeliverableSubmissionsQuery = (instanceId: string | null, enabled = true) => {
  const result = useInfiniteQuery({
    queryKey: deliverableKeys.submissions(instanceId ?? "none"),
    queryFn: ({ pageParam }) => listDeliverableSubmissionsRequest(instanceId as string, { take: 10, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(instanceId) && enabled,
  });
  return { ...result, rows: result.data?.pages.flatMap((page) => page.items) ?? [], totalItems: result.data?.pages[0]?.totalItems ?? 0 };
};

export const useDeliverableFeedbackQuery = (instanceId: string | null, enabled = true) => {
  const result = useInfiniteQuery({
    queryKey: deliverableKeys.feedback(instanceId ?? "none"),
    queryFn: ({ pageParam }) => listDeliverableFeedbackRequest(instanceId as string, { take: 10, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(instanceId) && enabled,
  });
  return { ...result, rows: result.data?.pages.flatMap((page) => page.items) ?? [], totalItems: result.data?.pages[0]?.totalItems ?? 0 };
};

function useDeliverableInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: deliverableKeys.all });
}

export function useSubmitDeliverableMutation(handlers?: MutationHandlers<DeliverableInstance>) {
  const invalidate = useDeliverableInvalidation();
  return useMutation<DeliverableInstance, Error, SubmitDeliverableVariables>({
    mutationFn: submitDeliverableRequest,
    onSuccess: async (data) => {
      await invalidate();
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export function useReviewDeliverableMutation(handlers?: MutationHandlers<DeliverableReview>) {
  const invalidate = useDeliverableInvalidation();
  return useMutation<DeliverableReview, Error, ReviewDeliverableVariables>({
    mutationFn: reviewDeliverableRequest,
    onSuccess: async (data) => {
      await invalidate();
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export function useMarkDeliverableReviewReadMutation(handlers?: MutationHandlers<{ id: string; readAt: string }>) {
  const invalidate = useDeliverableInvalidation();
  return useMutation<{ id: string; readAt: string }, Error, string>({
    mutationFn: markDeliverableReviewReadRequest,
    onSuccess: async (data) => {
      await invalidate();
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export function useUpdateDeliverableDueDateMutation(handlers?: MutationHandlers<DeliverableInstance>) {
  const invalidate = useDeliverableInvalidation();
  return useMutation<DeliverableInstance, Error, UpdateDeliverableDueDateVariables>({
    mutationFn: updateDeliverableDueDateRequest,
    onSuccess: async (data) => {
      await invalidate();
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}
