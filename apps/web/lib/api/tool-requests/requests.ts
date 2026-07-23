import { apiRequest } from "../client";
import type {
  CreateToolRequestPayload,
  ToolRequestPage,
  ToolRequestQuery,
  ToolRequestRecord,
  ToolRequestSummary,
  UpdateToolRequestPayload,
} from "./types";

function toQueryString(query?: ToolRequestQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.status) params.set("status", query.status);
  if (query?.toolAreaId) params.set("toolAreaId", query.toolAreaId);
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const listToolRequestsRequest = (query?: ToolRequestQuery) =>
  apiRequest<ToolRequestPage>(`/tool-requests${toQueryString(query)}`);
export const getToolRequestSummaryRequest = () =>
  apiRequest<ToolRequestSummary>("/tool-requests/summary");

export const getToolRequestRequest = (id: string) =>
  apiRequest<ToolRequestRecord>(`/tool-requests/${id}`);

export const createToolRequestRequest = (payload: CreateToolRequestPayload) =>
  apiRequest<ToolRequestRecord>("/tool-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateToolRequestRequest = (
  id: string,
  payload: UpdateToolRequestPayload,
) =>
  apiRequest<ToolRequestRecord>(`/tool-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
