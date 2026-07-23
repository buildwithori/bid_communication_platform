import { apiRequest } from "../client";
import type {
  AcceptTrainerInvitationPayload,
  InvitationResendResult,
  InviteTrainerPayload,
  TrainerPage,
  TrainerProfilePayload,
  TrainerQuery,
  TrainerRecord,
  TrainerSummary,
  UpdateTrainerStatusVariables,
  UpdateTrainerVariables,
} from "./types";

function toQueryString(query?: TrainerQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.sectorId) params.set("sectorId", query.sectorId);
  if (query?.accessLevel) params.set("accessLevel", query.accessLevel);
  if (query?.status) params.set("status", query.status);
  if (query?.calendarStatus)
    params.set("calendarStatus", query.calendarStatus);
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listTrainersRequest(query?: TrainerQuery) {
  return apiRequest<TrainerPage>(`/trainers${toQueryString(query)}`);
}

export function getTrainerSummaryRequest() {
  return apiRequest<TrainerSummary>("/trainers/summary");
}

export function getTrainerRequest(id: string) {
  return apiRequest<TrainerRecord>(`/trainers/${id}`);
}

export function inviteTrainerRequest(payload: InviteTrainerPayload) {
  return apiRequest<TrainerRecord>("/trainers/invitations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resendTrainerInvitationRequest(id: string) {
  return apiRequest<InvitationResendResult>(
    `/trainers/${id}/invitation/resend`,
    { method: "POST" },
  );
}

export function updateTrainerRequest({ id, payload }: UpdateTrainerVariables) {
  return apiRequest<TrainerRecord>(`/trainers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateTrainerStatusRequest({
  id,
  status,
}: UpdateTrainerStatusVariables) {
  return apiRequest<TrainerRecord>(`/trainers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getTrainerProfileRequest() {
  return apiRequest<TrainerRecord>("/trainers/me/profile");
}

export function updateTrainerProfileRequest(payload: TrainerProfilePayload) {
  return apiRequest<TrainerRecord>("/trainers/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function acceptTrainerInvitationRequest(
  payload: AcceptTrainerInvitationPayload,
) {
  return apiRequest<TrainerRecord>("/trainer-invitations/accept", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
