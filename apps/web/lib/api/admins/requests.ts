import { apiRequest } from "../client";
import type {
  AcceptAdminInvitationPayload,
  AdminDirectorySummary,
  AdminPage,
  AdminProfilePayload,
  AdminQuery,
  AdminRecord,
  InvitationResendResult,
  InviteAdminPayload,
  UpdateAdminStatusVariables,
} from "./types";

function toQueryString(query?: AdminQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.status) params.set("status", query.status);
  if (query?.calendarStatus) params.set("calendarStatus", query.calendarStatus);
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listAdminsRequest(query?: AdminQuery) {
  return apiRequest<AdminPage>(`/admins${toQueryString(query)}`);
}

export function getAdminSummaryRequest() {
  return apiRequest<AdminDirectorySummary>("/admins/summary");
}

export function getAdminRequest(id: string) {
  return apiRequest<AdminRecord>(`/admins/${id}`);
}

export function inviteAdminRequest(payload: InviteAdminPayload) {
  return apiRequest<AdminRecord>("/admins/invitations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resendAdminInvitationRequest(id: string) {
  return apiRequest<InvitationResendResult>(`/admins/${id}/invitation/resend`, {
    method: "POST",
  });
}

export function updateAdminStatusRequest({
  id,
  status,
}: UpdateAdminStatusVariables) {
  return apiRequest<AdminRecord>(`/admins/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getAdminProfileRequest() {
  return apiRequest<AdminRecord>("/admins/me/profile");
}

export function updateAdminProfileRequest(payload: AdminProfilePayload) {
  return apiRequest<AdminRecord>("/admins/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function acceptAdminInvitationRequest(
  payload: AcceptAdminInvitationPayload,
) {
  return apiRequest<AdminRecord>("/admin-invitations/accept", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
