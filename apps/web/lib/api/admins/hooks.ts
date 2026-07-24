"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { retainPreviousQueryData } from "../query-behavior";
import { adminKeys } from "./keys";
import { authKeys } from "../auth/keys";
import {
  acceptAdminInvitationRequest,
  getAdminProfileRequest,
  getAdminRequest,
  getAdminSummaryRequest,
  inviteAdminRequest,
  listAdminsRequest,
  resendAdminInvitationRequest,
  updateAdminProfileRequest,
  updateAdminStatusRequest,
} from "./requests";
import type {
  AcceptAdminInvitationPayload,
  AdminProfilePayload,
  AdminQuery,
  AdminRecord,
  InvitationResendResult,
  InviteAdminPayload,
  UpdateAdminStatusVariables,
} from "./types";

type MutationHandlers<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

type AdminPageQuery = Omit<AdminQuery, "cursor">;

export function useAdminsPage(query: AdminPageQuery) {
  const [page, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const cursor = cursors[page - 1];
  const result = useQuery({
    queryKey: adminKeys.list({ ...query, cursor }),
    queryFn: () => listAdminsRequest({ ...query, cursor }),
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
    rows: (result.data?.items ?? []) as AdminRecord[],
    totalItems: result.data?.totalItems ?? 0,
    setPage,
    resetPagination,
  };
}

export function useAdminSummaryQuery() {
  return useQuery({
    queryKey: adminKeys.summary(),
    queryFn: getAdminSummaryRequest,
  });
}

export function useAdminDetailQuery(id: string | null) {
  return useQuery({
    queryKey: adminKeys.detail(id ?? "none"),
    queryFn: () => getAdminRequest(id as string),
    enabled: Boolean(id),
  });
}

export function useAdminProfileQuery() {
  return useQuery({
    queryKey: adminKeys.profile(),
    queryFn: getAdminProfileRequest,
  });
}

function useAdminMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  handlers?: MutationHandlers<TData>,
) {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export function useInviteAdminMutation(
  handlers?: MutationHandlers<AdminRecord>,
) {
  return useAdminMutation<AdminRecord, InviteAdminPayload>(
    inviteAdminRequest,
    handlers,
  );
}

export function useResendAdminInvitationMutation(
  handlers?: MutationHandlers<InvitationResendResult>,
) {
  return useAdminMutation<InvitationResendResult, string>(
    resendAdminInvitationRequest,
    handlers,
  );
}

export function useUpdateAdminStatusMutation(
  handlers?: MutationHandlers<AdminRecord>,
) {
  return useAdminMutation<AdminRecord, UpdateAdminStatusVariables>(
    updateAdminStatusRequest,
    handlers,
  );
}

export function useUpdateAdminProfileMutation(
  handlers?: MutationHandlers<AdminRecord>,
) {
  const queryClient = useQueryClient();
  return useMutation<AdminRecord, Error, AdminProfilePayload>({
    mutationFn: updateAdminProfileRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(adminKeys.profile(), data);
      void queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      handlers?.onSuccess?.(data);
    },
    onError: handlers?.onError,
  });
}

export function useAcceptAdminInvitationMutation(
  handlers?: MutationHandlers<AdminRecord>,
) {
  return useMutation<AdminRecord, Error, AcceptAdminInvitationPayload>({
    mutationFn: acceptAdminInvitationRequest,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });
}
