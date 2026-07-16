import { apiRequest } from "../client";
import type {
  CreateSessionPayload,
  SessionAvailability,
  SessionAvailabilityQuery,
  SessionCompleteVariables,
  SessionNoteVariables,
  SessionPage,
  SessionQuery,
  SessionReasonVariables,
  SessionRecord,
  SessionRescheduleVariables,
  SessionTeamMemberPage,
  SessionTeamMemberQuery,
} from "./types";

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
export function listSessionsRequest(query?: SessionQuery) {
  return apiRequest<SessionPage>(
    `/sessions${queryString({ ...(query ?? {}) })}`,
  );
}
export function getSessionRequest(id: string) {
  return apiRequest<SessionRecord>(`/sessions/${id}`);
}
export function listSessionTeamMembersRequest(query?: SessionTeamMemberQuery) {
  return apiRequest<SessionTeamMemberPage>(
    `/sessions/team-members${queryString({ ...(query ?? {}) })}`,
  );
}
export function getSessionAvailabilityRequest(query: SessionAvailabilityQuery) {
  return apiRequest<SessionAvailability>(
    `/sessions/availability${queryString(query)}`,
  );
}
export function createSessionRequest(payload: CreateSessionPayload) {
  return apiRequest<SessionRecord>("/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function acceptSessionRequest(id: string) {
  return apiRequest<SessionRecord>(`/sessions/${id}/accept`, {
    method: "POST",
  });
}
export function declineSessionRequest({ id, reason }: SessionReasonVariables) {
  return apiRequest<SessionRecord>(`/sessions/${id}/decline`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
export function cancelSessionRequest({ id, reason }: SessionReasonVariables) {
  return apiRequest<SessionRecord>(`/sessions/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
export function rescheduleSessionRequest({
  id,
  ...payload
}: SessionRescheduleVariables) {
  return apiRequest<SessionRecord>(`/sessions/${id}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export function completeSessionRequest({
  id,
  ...payload
}: SessionCompleteVariables) {
  return apiRequest<SessionRecord>(`/sessions/${id}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function addSessionNoteRequest({
  id,
  ...payload
}: SessionNoteVariables) {
  return apiRequest<SessionRecord>(`/sessions/${id}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
