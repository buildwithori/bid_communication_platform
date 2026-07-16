"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { reportingKeys } from "./keys";
import {
  createReportExportRequest,
  getOverdueUpdatesRequest,
  getReportExportDownloadRequest,
  getReportExportRequest,
  getReportingOverviewRequest,
  sendReportingReminderRequest,
} from "./requests";
import type {
  CreateReportExportPayload,
  OverdueUpdatesQuery,
  ReportExport,
  ReportExportDownload,
  ReportingQuery,
  SendReportingReminderPayload,
} from "./types";

type MutationHandlers<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

export const useReportingOverviewQuery = (query: ReportingQuery) =>
  useQuery({
    queryKey: reportingKeys.overview(query),
    queryFn: () => getReportingOverviewRequest(query),
  });

export function useOverdueUpdatesPage(
  query: Omit<OverdueUpdatesQuery, "cursor">,
) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: reportingKeys.overdue({ ...query, cursor }),
    queryFn: () => getOverdueUpdatesRequest({ ...query, cursor }),
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
    overdueAfterDays: result.data?.overdueAfterDays ?? 0,
    setPage,
    resetPagination,
  };
}

export const useCreateReportExportMutation = (
  handlers?: MutationHandlers<ReportExport>,
) =>
  useMutation<ReportExport, Error, CreateReportExportPayload>({
    mutationFn: createReportExportRequest,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });

export const useReportExportQuery = (id: string | null) =>
  useQuery({
    queryKey: reportingKeys.export(id ?? "none"),
    queryFn: () => getReportExportRequest(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "processing" ? 1_500 : false;
    },
  });

export const useReportExportDownloadMutation = (
  handlers?: MutationHandlers<ReportExportDownload>,
) =>
  useMutation<ReportExportDownload, Error, string>({
    mutationFn: getReportExportDownloadRequest,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });

export const useSendReportingReminderMutation = (
  handlers?: MutationHandlers<unknown>,
) =>
  useMutation<unknown, Error, SendReportingReminderPayload>({
    mutationFn: sendReportingReminderRequest,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });
