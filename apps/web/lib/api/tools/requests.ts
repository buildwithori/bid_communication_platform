import { apiRequest } from "../client";
import type {
  CreateToolPayload,
  ToolPage,
  ToolPayload,
  ToolQuery,
  ToolRecord,
} from "./types";

function toQueryString(query?: ToolQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.type) params.set("type", query.type);
  if (query?.visibility) params.set("visibility", query.visibility);
  if (query?.status) params.set("status", query.status);
  if (query?.toolAreaId) params.set("toolAreaId", query.toolAreaId);
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const listToolsRequest = (query?: ToolQuery) =>
  apiRequest<ToolPage>(`/tools${toQueryString(query)}`);

export const getToolRequest = (id: string) =>
  apiRequest<ToolRecord>(`/tools/${id}`);

export const createToolRequest = (payload: CreateToolPayload) =>
  apiRequest<ToolRecord>("/tools", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateToolRequest = (id: string, payload: ToolPayload) =>
  apiRequest<ToolRecord>(`/tools/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
