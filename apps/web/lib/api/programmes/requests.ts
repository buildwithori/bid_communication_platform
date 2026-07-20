import { apiRequest } from '../client';
import type {
  ArchiveProgrammeVariables,
  CreateProgrammeDeliverableRuleVariables,
  CreateProgrammeModuleVariables,
  CreateProgrammePayload,
  MoveProgrammeModuleVariables,
  ProgrammeDeliverableRule,
  ProgrammeDeliverableRulePage,
  ProgrammeDeliverableRuleQuery,
  ProgrammeDetail,
  ProgrammeModuleDetail,
  ProgrammeModulePage,
  ProgrammePlayerPayload,
  ProgrammeModuleQuery,
  ProgrammeModuleRecord,
  ProgrammePage,
  ProgrammeQuery,
  ProgrammeSummary,
  ReusableProgrammeModulePage,
  ReuseProgrammeModuleVariables,
  UpdateProgrammeDeliverableRuleVariables,
  UpdateProgrammeModuleVariables,
  UpdateProgrammeVariables,
} from './types';

function toQueryString(query?: ProgrammeQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.accessType) params.set('accessType', query.accessType);
  if (query?.lifecycle) params.set('lifecycle', query.lifecycle);
  if (query?.progressStatus) {
    params.set('progressStatus', query.progressStatus);
  }
  if (typeof query?.includeArchived === 'boolean') {
    params.set('includeArchived', String(query.includeArchived));
  }
  if (typeof query?.grantableOnly === 'boolean') {
    params.set('grantableOnly', String(query.grantableOnly));
  }
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export const listProgrammesRequest = (query?: ProgrammeQuery) => apiRequest<ProgrammePage>(`/programmes${toQueryString(query)}`);

export const getProgrammeSummaryRequest = () => apiRequest<ProgrammeSummary>('/programmes/summary');

export const getProgrammeRequest = (id: string) => apiRequest<ProgrammeDetail>(`/programmes/${id}`);

export const getProgrammePlayerRequest = (id: string) => apiRequest<ProgrammePlayerPayload>(`/programmes/${id}/player`);

export const createProgrammeRequest = (payload: CreateProgrammePayload) =>
  apiRequest<ProgrammeDetail>('/programmes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateProgrammeRequest = ({ id, payload }: UpdateProgrammeVariables) =>
  apiRequest<ProgrammeDetail>(`/programmes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const publishProgrammeRequest = (id: string) =>
  apiRequest<ProgrammeDetail>(`/programmes/${id}/publish`, {
    method: 'POST',
  });

export const archiveProgrammeRequest = ({ id, reason }: ArchiveProgrammeVariables) =>
  apiRequest<ProgrammeDetail>(`/programmes/${id}/archive`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const restoreProgrammeRequest = (id: string) =>
  apiRequest<ProgrammeDetail>(`/programmes/${id}/restore`, {
    method: 'POST',
  });

function toModuleQueryString(query?: ProgrammeModuleQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.contentType) params.set('contentType', query.contentType);
  if (query?.progressStatus) {
    params.set('progressStatus', query.progressStatus);
  }
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export const listProgrammeModulesRequest = (programmeId: string, query?: ProgrammeModuleQuery) => apiRequest<ProgrammeModulePage>(`/programmes/${programmeId}/modules${toModuleQueryString(query)}`);

export const getProgrammeModuleRequest = (programmeId: string, moduleId: string) => apiRequest<ProgrammeModuleDetail>('/programmes/' + programmeId + '/modules/' + moduleId);

export const listReusableProgrammeModulesRequest = (programmeId: string, query?: ProgrammeModuleQuery) =>
  apiRequest<ReusableProgrammeModulePage>(`/programmes/${programmeId}/reusable-modules${toModuleQueryString(query)}`);

export const createProgrammeModuleRequest = ({ programmeId, payload }: CreateProgrammeModuleVariables) =>
  apiRequest<ProgrammeModuleRecord>(`/programmes/${programmeId}/modules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateProgrammeModuleRequest = ({ programmeId, moduleId, payload }: UpdateProgrammeModuleVariables) =>
  apiRequest<ProgrammeModuleRecord>(`/programmes/${programmeId}/modules/${moduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const reuseProgrammeModuleRequest = ({ programmeId, moduleId }: ReuseProgrammeModuleVariables) =>
  apiRequest<ProgrammeModuleRecord>(`/programmes/${programmeId}/modules/reuse`, {
    method: 'POST',
    body: JSON.stringify({ moduleId }),
  });

export const moveProgrammeModuleRequest = ({ programmeId, moduleId, position }: MoveProgrammeModuleVariables) =>
  apiRequest<ProgrammeModuleRecord>(`/programmes/${programmeId}/modules/${moduleId}/move`, {
    method: 'POST',
    body: JSON.stringify({ position }),
  });

function toDeliverableRuleQueryString(query?: ProgrammeDeliverableRuleQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export const listProgrammeDeliverableRulesRequest = (programmeId: string, query?: ProgrammeDeliverableRuleQuery) =>
  apiRequest<ProgrammeDeliverableRulePage>(`/programmes/${programmeId}/deliverable-rules${toDeliverableRuleQueryString(query)}`);

export const createProgrammeDeliverableRuleRequest = ({ programmeId, payload }: CreateProgrammeDeliverableRuleVariables) =>
  apiRequest<ProgrammeDeliverableRule>(`/programmes/${programmeId}/deliverable-rules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateProgrammeDeliverableRuleRequest = ({ programmeId, ruleId, payload }: UpdateProgrammeDeliverableRuleVariables) =>
  apiRequest<ProgrammeDeliverableRule>(`/programmes/${programmeId}/deliverable-rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
