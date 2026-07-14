import { apiRequest } from './client';

export type ApiToolRequestStatus = 'under_review' | 'in_development' | 'built' | 'declined';

export type ToolRequestRecord = {
  id: string;
  entrepreneurUserId: string;
  title: string;
  businessNeed: string;
  toolArea: {
    id: string;
    name: string;
    key: string;
  };
  neededBy: string | null;
  status: ApiToolRequestStatus;
  adminDecisionNote: string | null;
  decidedAt: string | null;
  decidedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  linkedTool: {
    id: string;
    name: string;
    status: string;
  } | null;
  entrepreneur: {
    userId: string;
    name: string;
    email: string;
    businessId: string | null;
    businessName: string;
    country: string | null;
    programmes: Array<{ id: string; name: string }>;
  };
  createdAt: string;
  updatedAt: string;
};

export type ToolRequestQuery = {
  search?: string;
  status?: ApiToolRequestStatus;
  toolAreaId?: string;
  take?: number;
  cursor?: string;
};

export type CreateToolRequestPayload = {
  title: string;
  businessNeed: string;
  toolAreaId: string;
  neededBy?: string | null;
};

export type UpdateToolRequestPayload = {
  status?: ApiToolRequestStatus;
  adminDecisionNote?: string | null;
  linkedToolId?: string | null;
};

function toQueryString(query?: ToolRequestQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.status) params.set('status', query.status);
  if (query?.toolAreaId) params.set('toolAreaId', query.toolAreaId);
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listToolRequests(query?: ToolRequestQuery) {
  return apiRequest<{ items: ToolRequestRecord[]; nextCursor: string | null }>(
    `/tool-requests${toQueryString(query)}`,
  );
}

export function getToolRequest(id: string) {
  return apiRequest<ToolRequestRecord>(`/tool-requests/${id}`);
}

export function createToolRequest(payload: CreateToolRequestPayload) {
  return apiRequest<ToolRequestRecord>('/tool-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateToolRequest(id: string, payload: UpdateToolRequestPayload) {
  return apiRequest<ToolRequestRecord>(`/tool-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
