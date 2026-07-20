'use client';

import { useCallback, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contentKeys } from './keys';
import { programmeKeys } from '../programmes/keys';
import { listToolsRequest } from '../tools/requests';
import {
  attachContentItemRequest,
  createModuleContentItemRequest,
  deleteContentItemRequest,
  getMyContentRatingRequest,
  listContentItemsRequest,
  listModuleContentItemsRequest,
  moveModuleContentItemRequest,
  saveContentRatingRequest,
  updateContentItemRequest,
} from './requests';
import type {
  AttachContentItemVariables,
  ContentItemQuery,
  ContentItemRecord,
  ContentDeletionResult,
  DeleteContentItemVariables,
  ContentRatingPayload,
  CreateModuleContentVariables,
  MoveModuleContentItemVariables,
  SaveContentRatingInput,
  UpdateContentItemVariables,
} from './types';

type PageQuery = Omit<ContentItemQuery, 'cursor'>;
type Handlers = {
  onSuccess?: (data: ContentItemRecord) => void;
  onError?: (error: Error) => void;
};

function useCursorPage(query: PageQuery, request: (query: ContentItemQuery) => ReturnType<typeof listContentItemsRequest>, queryKey: (query: ContentItemQuery) => readonly unknown[], enabled = true) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: queryKey({ ...query, cursor }),
    queryFn: () => request({ ...query, cursor }),
    enabled,
  });

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);

  const setPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage === page) return;
      if (nextPage === 1 || (nextPage < page && cursors[nextPage - 1] !== undefined)) {
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
    summary: result.data?.summary ?? {
      total: 0,
      video: 0,
      pdf: 0,
      tool: 0,
    },
    setPage,
    resetPagination,
  };
}

export const useMyContentRatingQuery = (contentItemId: string | null) =>
  useQuery({
    queryKey: contentKeys.rating(contentItemId ?? 'none'),
    queryFn: () => getMyContentRatingRequest(contentItemId as string),
    enabled: Boolean(contentItemId),
  });

export const useSaveContentRatingMutation = (handlers?: { onSuccess?: (data: ContentRatingPayload) => void; onError?: (error: Error) => void }) => {
  const client = useQueryClient();
  return useMutation<ContentRatingPayload, Error, SaveContentRatingInput>({
    mutationFn: saveContentRatingRequest,
    onSuccess: (data) => {
      client.setQueryData(contentKeys.rating(data.contentItemId), data);
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
};

export const useContentItemsPage = (query: PageQuery) => useCursorPage(query, listContentItemsRequest, contentKeys.list);

export const useModuleContentItemsPage = (moduleId: string, query: PageQuery, enabled = true) =>
  useCursorPage(
    query,
    (filters) => listModuleContentItemsRequest(moduleId, filters),
    (filters) => contentKeys.moduleList(moduleId, filters),
    enabled && Boolean(moduleId),
  );

export function useModuleContentItemsInfinite(moduleId: string, query: PageQuery & { enabled: boolean }) {
  const { enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: contentKeys.moduleList(moduleId, filters),
    queryFn: ({ pageParam }) =>
      listModuleContentItemsRequest(moduleId, {
        ...filters,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && Boolean(moduleId),
  });
  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
    totalItems: result.data?.pages[0]?.totalItems ?? 0,
  };
}

export function useLazyPublishedToolsLookup({
  enabled,
  search,
  excludeModuleId,
}: {
  enabled: boolean;
  search?: string;
  excludeModuleId?: string;
}) {
  const result = useInfiniteQuery({
    queryKey: [
      ...contentKeys.all,
      'published-tools',
      search ?? '',
      excludeModuleId ?? '',
    ],
    queryFn: ({ pageParam }) =>
      listToolsRequest({
        search,
        status: 'published',
        excludeModuleId,
        take: 20,
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

export function useLazyReusableContentItems(moduleId: string, query: PageQuery & { enabled: boolean }) {
  const { enabled, ...filters } = query;
  const result = useInfiniteQuery({
    queryKey: contentKeys.list({ ...filters, excludeModuleId: moduleId }),
    queryFn: ({ pageParam }) =>
      listContentItemsRequest({
        ...filters,
        excludeModuleId: moduleId,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && Boolean(moduleId),
  });
  return {
    ...result,
    rows: result.data?.pages.flatMap((page) => page.items) ?? [],
  };
}

function useContentMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<ContentItemRecord>, handlers?: Handlers) {
  const client = useQueryClient();
  return useMutation<ContentItemRecord, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      void client.invalidateQueries({ queryKey: contentKeys.all });
      void client.invalidateQueries({ queryKey: programmeKeys.all });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export const useCreateModuleContentMutation = (handlers?: Handlers) => useContentMutation<CreateModuleContentVariables>(createModuleContentItemRequest, handlers);

export const useUpdateContentItemMutation = (handlers?: Handlers) => useContentMutation<UpdateContentItemVariables>(updateContentItemRequest, handlers);

export const useDeleteContentItemMutation = (handlers?: { onSuccess?: (data: ContentDeletionResult) => void; onError?: (error: Error) => void }) => {
  const client = useQueryClient();
  return useMutation<ContentDeletionResult, Error, DeleteContentItemVariables>({
    mutationFn: deleteContentItemRequest,
    onSuccess: (data) => {
      void client.invalidateQueries({ queryKey: contentKeys.all });
      void client.invalidateQueries({ queryKey: programmeKeys.all });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
};

export const useAttachContentItemMutation = (handlers?: Handlers) => useContentMutation<AttachContentItemVariables>(attachContentItemRequest, handlers);

export const useMoveModuleContentItemMutation = (handlers?: Handlers) => useContentMutation<MoveModuleContentItemVariables>(moveModuleContentItemRequest, handlers);
