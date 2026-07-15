import { apiRequest } from "../client";
import type {
  ArchiveProgrammeVariables,
  CreateProgrammeDeliverableRuleVariables,
  CreateProgrammePayload,
  ProgrammeDeliverableRule,
  ProgrammeDetail,
  ProgrammePage,
  ProgrammeQuery,
  ProgrammeSummary,
  UpdateProgrammeDeliverableRuleVariables,
  UpdateProgrammeVariables,
} from "./types";

function toQueryString(query?: ProgrammeQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.accessType) params.set("accessType", query.accessType);
  if (query?.lifecycle) params.set("lifecycle", query.lifecycle);
  if (typeof query?.includeArchived === "boolean") {
    params.set("includeArchived", String(query.includeArchived));
  }
  if (typeof query?.grantableOnly === "boolean") {
    params.set("grantableOnly", String(query.grantableOnly));
  }
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const listProgrammesRequest = (query?: ProgrammeQuery) =>
  apiRequest<ProgrammePage>(`/programmes${toQueryString(query)}`);

export const getProgrammeSummaryRequest = () =>
  apiRequest<ProgrammeSummary>("/programmes/summary");

export const getProgrammeRequest = (id: string) =>
  apiRequest<ProgrammeDetail>(`/programmes/${id}`);

export const createProgrammeRequest = (payload: CreateProgrammePayload) =>
  apiRequest<ProgrammeDetail>("/programmes", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateProgrammeRequest = ({
  id,
  payload,
}: UpdateProgrammeVariables) =>
  apiRequest<ProgrammeDetail>(`/programmes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const publishProgrammeRequest = (id: string) =>
  apiRequest<ProgrammeDetail>(`/programmes/${id}/publish`, {
    method: "POST",
  });

export const archiveProgrammeRequest = ({
  id,
  reason,
}: ArchiveProgrammeVariables) =>
  apiRequest<ProgrammeDetail>(`/programmes/${id}/archive`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const restoreProgrammeRequest = (id: string) =>
  apiRequest<ProgrammeDetail>(`/programmes/${id}/restore`, {
    method: "POST",
  });

export const listProgrammeDeliverableRulesRequest = (programmeId: string) =>
  apiRequest<{ items: ProgrammeDeliverableRule[] }>(
    `/programmes/${programmeId}/deliverable-rules`,
  );

export const createProgrammeDeliverableRuleRequest = ({
  programmeId,
  payload,
}: CreateProgrammeDeliverableRuleVariables) =>
  apiRequest<ProgrammeDeliverableRule>(
    `/programmes/${programmeId}/deliverable-rules`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const updateProgrammeDeliverableRuleRequest = ({
  programmeId,
  ruleId,
  payload,
}: UpdateProgrammeDeliverableRuleVariables) =>
  apiRequest<ProgrammeDeliverableRule>(
    `/programmes/${programmeId}/deliverable-rules/${ruleId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
