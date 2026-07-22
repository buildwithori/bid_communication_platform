'use client';

import { useCallback, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
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
  ContentItemPage,
  ContentItemRecord,
  ContentDeletionResult,
  DeleteContentItemVariables,
  ContentRatingPayload,
  ContentRatingContext,
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

function useCursorPage(
  query: PageQuery,
  request: (query: ContentItemQuery) =>
    ReturnType<typeof listContentItemsRequest>,
  queryKey: (query: ContentItemQuery) => readonly unknown[],
  enabled = true,
  preservePreviousSummary = false,
) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: queryKey({ ...query, cursor }),
    queryFn: () => request({ ...query, cursor }),
    enabled,
    placeholderData: preservePreviousSummary
      ? (previousData) => previousData
      : undefined,
    refetchInterval: (current) =>
      current.state.data?.items.some((item) => item.status === 'processing')
        ? 5_000
        : false,
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
    summary: {
      total: result.data?.summary?.total ?? 0,
      video: result.data?.summary?.video ?? 0,
      pdf: result.data?.summary?.pdf ?? 0,
      excel: result.data?.summary?.excel ?? 0,
      tool: result.data?.summary?.tool ?? 0,
    },
    setPage,
    resetPagination,
  };
}

export const useMyContentRatingQuery = (context: ContentRatingContext | null) =>
  useQuery({
    queryKey: contentKeys.rating(
      context ?? {
        programmeId: 'none',
        moduleId: 'none',
        contentItemId: 'none',
      },
    ),
    queryFn: () => getMyContentRatingRequest(context as ContentRatingContext),
    enabled: Boolean(context),
  });

export const useSaveContentRatingMutation = (handlers?: { onSuccess?: (data: ContentRatingPayload) => void; onError?: (error: Error) => void }) => {
  const client = useQueryClient();
  return useMutation<ContentRatingPayload, Error, SaveContentRatingInput>({
    mutationFn: saveContentRatingRequest,
    onSuccess: (data) => {
      client.setQueryData(
        contentKeys.rating({
          programmeId: data.programmeId,
          moduleId: data.moduleId,
          contentItemId: data.contentItemId,
        }),
        data,
      );
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
};

export const useContentItemsPage = (query: PageQuery) =>
  useCursorPage(query, listContentItemsRequest, contentKeys.list, true, true);

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
    refetchInterval: (current) =>
      current.state.data?.pages.some((page) =>
        page.items.some((item) => item.status === 'processing'),
      )
        ? 5_000
        : false,
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
    queryKey: contentKeys.list({ ...filters, reusableForModuleId: moduleId }),
    queryFn: ({ pageParam }) =>
      listContentItemsRequest({
        ...filters,
        reusableForModuleId: moduleId,
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

export const useMoveModuleContentItemMutation = (handlers?: Handlers) => {
  const client = useQueryClient();
  return useMutation<
    ContentItemRecord,
    Error,
    MoveModuleContentItemVariables,
    {
      snapshots: Array<[
        readonly unknown[],
        InfiniteData<ContentItemPage, string | undefined> | undefined,
      ]>;
    }
  >({
    mutationFn: moveModuleContentItemRequest,
    onMutate: async (variables) => {
      const queryKey = contentKeys.module(variables.moduleId);
      const cancellation = client.cancelQueries({ queryKey });
      const snapshots = client.getQueriesData<
        InfiniteData<ContentItemPage, string | undefined>
      >({ queryKey });

      client.setQueriesData<InfiniteData<ContentItemPage, string | undefined>>(
        { queryKey },
        (
          data:
            | InfiniteData<ContentItemPage, string | undefined>
            | undefined,
        ) => reorderModuleContentPages(data, variables),
      );
      await cancellation;
      return { snapshots };
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        client.setQueryData(queryKey, data);
      });
      handlers?.onError?.(error);
    },
    onSuccess: (data) => handlers?.onSuccess?.(data),
    onSettled: (_data, _error, variables) => {
      void client.invalidateQueries({
        queryKey: contentKeys.module(variables.moduleId),
      });
      void client.invalidateQueries({ queryKey: programmeKeys.all });
    },
  });
};

function reorderModuleContentPages(
  data: InfiniteData<ContentItemPage, string | undefined> | undefined,
  variables: MoveModuleContentItemVariables,
) {
  if (!data) return data;
  const items = data.pages.flatMap((page) => page.items);
  const sourceIndex = items.findIndex(
    (item) => item.id === variables.contentItemId,
  );
  const targetIndex = items.findIndex(
    (item) => item.usage.position === variables.position,
  );
  if (sourceIndex < 0 || targetIndex < 0) return data;

  const positions = items.map((item) => item.usage.position);
  const reordered = [...items];
  const [moved] = reordered.splice(sourceIndex, 1);
  if (!moved) return data;
  reordered.splice(targetIndex, 0, moved);
  const positioned = reordered.map((item, index) => ({
    ...item,
    usage: {
      ...item.usage,
      position: positions[index] ?? item.usage.position,
    },
  }));

  let offset = 0;
  return {
    ...data,
    pages: data.pages.map((page) => {
      const pageItems = positioned.slice(offset, offset + page.items.length);
      offset += page.items.length;
      return { ...page, items: pageItems };
    }),
  };
}
