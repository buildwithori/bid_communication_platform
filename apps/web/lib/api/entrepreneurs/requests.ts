import { apiRequest } from "../client";
import type {
  AcceptEntrepreneurInvitationPayload,
  CursorPage,
  EffectiveToolAccess,
  EffectiveToolQuery,
  EntrepreneurPage,
  EntrepreneurProfilePayload,
  EntrepreneurQuery,
  EntrepreneurRecord,
  EntrepreneurProgrammeAccess,
  FundraisingRoundPayload,
  FundraisingRoundRecord,
  InvitationResendResult,
  InviteEntrepreneurPayload,
  PeriodicUpdatePayload,
  PeriodicUpdateRecord,
  ProfileRecordQuery,
  ProgrammeAccessQuery,
  ProgrammeAccessVariables,
  ProgrammeGoalPayload,
  ProgrammeGoalRecord,
  RecordMutationVariables,
  ToolAccessVariables,
  UpdateEntrepreneurStatusVariables,
  UpdateEntrepreneurVariables,
} from "./types";

function queryString(
  query?:
    | EntrepreneurQuery
    | ProfileRecordQuery
    | ProgrammeAccessQuery
    | EffectiveToolQuery,
) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query && "sectorId" in query && query.sectorId)
    params.set("sectorId", query.sectorId);
  if (query && "stageId" in query && query.stageId)
    params.set("stageId", query.stageId);
  if (query && "status" in query && query.status)
    params.set("status", query.status);
  if (query && "source" in query && query.source)
    params.set("source", query.source);
  if (query && "programmeId" in query && query.programmeId)
    params.set("programmeId", query.programmeId);
  if (query && "type" in query && query.type) params.set("type", query.type);
  if (query && "toolAreaId" in query && query.toolAreaId)
    params.set("toolAreaId", query.toolAreaId);
  if (query && "includeUnavailable" in query && query.includeUnavailable)
    params.set("includeUnavailable", "true");
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const listEntrepreneursRequest = (query?: EntrepreneurQuery) =>
  apiRequest<EntrepreneurPage>(`/entrepreneurs${queryString(query)}`);
export const getEntrepreneurRequest = (id: string) =>
  apiRequest<EntrepreneurRecord>(`/entrepreneurs/${id}`);
export const getEntrepreneurProfileRequest = () =>
  apiRequest<EntrepreneurRecord>("/entrepreneurs/me/profile");
export const inviteEntrepreneurRequest = (payload: InviteEntrepreneurPayload) =>
  apiRequest<EntrepreneurRecord>("/entrepreneurs/invitations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const resendEntrepreneurInvitationRequest = (id: string) =>
  apiRequest<InvitationResendResult>(`/entrepreneurs/${id}/invitation/resend`, {
    method: "POST",
  });
export const updateEntrepreneurRequest = ({
  id,
  payload,
}: UpdateEntrepreneurVariables) =>
  apiRequest<EntrepreneurRecord>(`/entrepreneurs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const updateEntrepreneurProfileRequest = (
  payload: EntrepreneurProfilePayload,
) =>
  apiRequest<EntrepreneurRecord>("/entrepreneurs/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const updateEntrepreneurStatusRequest = ({
  id,
  status,
}: UpdateEntrepreneurStatusVariables) =>
  apiRequest<EntrepreneurRecord>(`/entrepreneurs/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const grantProgrammeAccessRequest = ({
  id,
  programmeId,
}: ProgrammeAccessVariables) =>
  apiRequest<EntrepreneurRecord>(`/entrepreneurs/${id}/programme-access`, {
    method: "POST",
    body: JSON.stringify({ programmeId }),
  });
export const revokeProgrammeAccessRequest = ({
  id,
  programmeId,
  reason,
}: ProgrammeAccessVariables) =>
  apiRequest<EntrepreneurRecord>(
    `/entrepreneurs/${id}/programme-access/revoke`,
    { method: "POST", body: JSON.stringify({ programmeId, reason }) },
  );
export const acceptEntrepreneurInvitationRequest = (
  payload: AcceptEntrepreneurInvitationPayload,
) =>
  apiRequest<EntrepreneurRecord>("/entrepreneur-invitations/accept", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const listProgrammeAccessRequest = (
  id: string,
  query?: ProgrammeAccessQuery,
) =>
  apiRequest<CursorPage<EntrepreneurProgrammeAccess>>(
    `/entrepreneurs/${id}/programme-access${queryString(query)}`,
  );
export const listEffectiveToolsRequest = (
  id: string,
  query?: EffectiveToolQuery,
) =>
  apiRequest<CursorPage<EffectiveToolAccess>>(
    `/tools/entrepreneur/${id}${queryString(query)}`,
  );
const toolAccessRequest = (
  action: "grant" | "revoke" | "hide" | "restore",
  { entrepreneurId, toolId }: ToolAccessVariables,
) =>
  apiRequest<{ ok: boolean }>(
    `/tools/${toolId}/entrepreneur/${entrepreneurId}/${action}`,
    {
      method: "POST",
    },
  );
export const grantToolAccessRequest = (variables: ToolAccessVariables) =>
  toolAccessRequest("grant", variables);
export const revokeToolAccessRequest = (variables: ToolAccessVariables) =>
  toolAccessRequest("revoke", variables);
export const hideToolAccessRequest = (variables: ToolAccessVariables) =>
  toolAccessRequest("hide", variables);
export const restoreToolAccessRequest = (variables: ToolAccessVariables) =>
  toolAccessRequest("restore", variables);
export const listProgrammeGoalsRequest = (
  id: string,
  query?: ProfileRecordQuery,
) =>
  apiRequest<CursorPage<ProgrammeGoalRecord>>(
    `/entrepreneurs/${id}/programme-goals${queryString(query)}`,
  );
export const listFundraisingRoundsRequest = (
  id: string,
  query?: ProfileRecordQuery,
) =>
  apiRequest<CursorPage<FundraisingRoundRecord>>(
    `/entrepreneurs/${id}/fundraising-rounds${queryString(query)}`,
  );
export const listPeriodicUpdatesRequest = (
  id: string,
  query?: ProfileRecordQuery,
) =>
  apiRequest<CursorPage<PeriodicUpdateRecord>>(
    `/entrepreneurs/${id}/periodic-updates${queryString(query)}`,
  );

export const saveProgrammeGoalRequest = ({
  entrepreneurId,
  recordId,
  payload,
}: RecordMutationVariables<ProgrammeGoalPayload>) =>
  apiRequest<ProgrammeGoalRecord>(
    `/entrepreneurs/${entrepreneurId}/programme-goals${recordId ? `/${recordId}` : ""}`,
    {
      method: recordId ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    },
  );
export const saveFundraisingRoundRequest = ({
  entrepreneurId,
  recordId,
  payload,
}: RecordMutationVariables<FundraisingRoundPayload>) =>
  apiRequest<FundraisingRoundRecord>(
    `/entrepreneurs/${entrepreneurId}/fundraising-rounds${recordId ? `/${recordId}` : ""}`,
    {
      method: recordId ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    },
  );
export const savePeriodicUpdateRequest = ({
  entrepreneurId,
  recordId,
  payload,
}: RecordMutationVariables<PeriodicUpdatePayload>) =>
  apiRequest<PeriodicUpdateRecord>(
    `/entrepreneurs/${entrepreneurId}/periodic-updates${recordId ? `/${recordId}` : ""}`,
    {
      method: recordId ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    },
  );
