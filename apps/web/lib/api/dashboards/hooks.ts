"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { retainPreviousQueryData } from "../query-behavior";
import { dashboardKeys } from "./keys";
import {
  getAdminDashboardRequest,
  getEntrepreneurDashboardRequest,
  getTrainerDashboardRequest,
  listAdminRecentEntrepreneursRequest,
} from "./requests";
import type { AdminDashboard, AdminRecentEntrepreneurQuery, DashboardRecentEntrepreneurPage, EntrepreneurDashboard, TrainerDashboard } from "./types";

export function useAdminDashboardQuery() {
  return useQuery<AdminDashboard>({
    queryKey: dashboardKeys.admin(),
    queryFn: getAdminDashboardRequest,
  });
}

export function useTrainerDashboardQuery() {
  return useQuery<TrainerDashboard>({
    queryKey: dashboardKeys.trainer(),
    queryFn: getTrainerDashboardRequest,
  });
}

export function useEntrepreneurDashboardQuery() {
  return useQuery<EntrepreneurDashboard>({
    queryKey: dashboardKeys.entrepreneur(),
    queryFn: getEntrepreneurDashboardRequest,
  });
}

export function useAdminRecentEntrepreneursPage(
  query: Omit<AdminRecentEntrepreneurQuery, "cursor">,
) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[page - 1];
  const result = useQuery<DashboardRecentEntrepreneurPage>({
    queryKey: dashboardKeys.recentEntrepreneurs({ ...query, cursor }),
    queryFn: () => listAdminRecentEntrepreneursRequest({ ...query, cursor }),
    placeholderData: retainPreviousQueryData,
  });
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursors([undefined]);
  }, []);
  const setPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage === page) return;
      if (nextPage < page || nextPage === 1) {
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
    [page, result.data?.nextCursor],
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
