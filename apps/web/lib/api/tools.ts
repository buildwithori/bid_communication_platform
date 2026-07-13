import { apiRequest } from './client';

export type ApiToolType = 'pdf' | 'embedded_tool';
export type ApiToolVisibility = 'all_entrepreneurs' | 'programmes' | 'entrepreneurs';
export type ApiToolStatus = 'draft' | 'published' | 'archived';

export type ToolRecord = {
  id: string;
  name: string;
  description: string;
  type: ApiToolType;
  toolArea: {
    id: string;
    name: string;
    key: string;
  };
  iconKey: string;
  visibility: ApiToolVisibility;
  status: ApiToolStatus;
  embeddedUrl: string | null;
  pdfAsset: {
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: string;
    status: string;
    storageKey: string;
  } | null;
  audience: {
    programmeIds: string[];
    entrepreneurUserIds: string[];
    hiddenEntrepreneurUserIds: string[];
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  updatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ToolQuery = {
  search?: string;
  type?: ApiToolType;
  visibility?: ApiToolVisibility;
  status?: ApiToolStatus;
  toolAreaId?: string;
  take?: number;
  cursor?: string;
};

export type ToolPayload = {
  name?: string;
  description?: string;
  type?: ApiToolType;
  toolAreaId?: string;
  iconKey?: string;
  visibility?: ApiToolVisibility;
  status?: ApiToolStatus;
  pdfAssetId?: string | null;
  embeddedUrl?: string | null;
  programmeIds?: string[];
  entrepreneurUserIds?: string[];
  hiddenEntrepreneurUserIds?: string[];
};

function toQueryString(query?: ToolQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.type) params.set('type', query.type);
  if (query?.visibility) params.set('visibility', query.visibility);
  if (query?.status) params.set('status', query.status);
  if (query?.toolAreaId) params.set('toolAreaId', query.toolAreaId);
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listTools(query?: ToolQuery) {
  return apiRequest<{ items: ToolRecord[]; nextCursor: string | null }>(
    `/tools${toQueryString(query)}`,
  );
}

export function getTool(id: string) {
  return apiRequest<ToolRecord>(`/tools/${id}`);
}

export function createTool(payload: Required<Pick<ToolPayload, 'name' | 'description' | 'type' | 'toolAreaId' | 'iconKey' | 'visibility' | 'status'>> & ToolPayload) {
  return apiRequest<ToolRecord>('/tools', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTool(id: string, payload: ToolPayload) {
  return apiRequest<ToolRecord>(`/tools/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
