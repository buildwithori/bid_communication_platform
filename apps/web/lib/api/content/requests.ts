import { apiRequest } from "../client";
import type {
  AttachContentItemVariables,
  ContentItemPage,
  ContentItemQuery,
  ContentItemRecord,
  ContentDeletionResult,
  DeleteContentItemVariables,
  ContentRatingPayload,
  ContentRatingContext,
  CreateModuleContentVariables,
  MoveModuleContentItemVariables,
  SaveContentRatingInput,
  UpdateContentItemVariables,
} from "./types";

function queryString(query?: ContentItemQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.programmeId) params.set("programmeId", query.programmeId);
  if (query?.type) params.set("type", query.type);
  if (query?.status) params.set("status", query.status);
  if (query?.trainerId) params.set("trainerId", query.trainerId);
  if (query?.moduleId) params.set("moduleId", query.moduleId);
  if (query?.excludeModuleId) {
    params.set("excludeModuleId", query.excludeModuleId);
  }
  if (query?.reusableForModuleId) {
    params.set("reusableForModuleId", query.reusableForModuleId);
  }
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const listContentItemsRequest = (query?: ContentItemQuery) =>
  apiRequest<ContentItemPage>(`/content/items${queryString(query)}`);

export const listModuleContentItemsRequest = (
  moduleId: string,
  query?: ContentItemQuery,
) =>
  apiRequest<ContentItemPage>(
    `/content/modules/${moduleId}/items${queryString(query)}`,
  );

export const createModuleContentItemRequest = ({
  moduleId,
  payload,
}: CreateModuleContentVariables) =>
  apiRequest<ContentItemRecord>(`/content/modules/${moduleId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const deleteContentItemRequest = ({ contentItemId, confirmation }: DeleteContentItemVariables) =>
  apiRequest<ContentDeletionResult>("/content/items/" + contentItemId, {
    method: "DELETE",
    body: JSON.stringify({ confirmation }),
  });

export const updateContentItemRequest = ({
  contentItemId,
  payload,
}: UpdateContentItemVariables) =>
  apiRequest<ContentItemRecord>(`/content/items/${contentItemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const attachContentItemRequest = ({
  moduleId,
  contentItemId,
}: AttachContentItemVariables) =>
  apiRequest<ContentItemRecord>(
    `/content/modules/${moduleId}/items/attach`,
    {
      method: "POST",
      body: JSON.stringify({ contentItemId }),
    },
  );

export const moveModuleContentItemRequest = ({
  moduleId,
  contentItemId,
  position,
}: MoveModuleContentItemVariables) =>
  apiRequest<ContentItemRecord>(
    `/content/modules/${moduleId}/items/${contentItemId}/move`,
    {
      method: "POST",
      body: JSON.stringify({ position }),
    },
  );

export const getMyContentRatingRequest = (context: ContentRatingContext) => {
  const params = new URLSearchParams({
    programmeId: context.programmeId,
    moduleId: context.moduleId,
  });
  return apiRequest<ContentRatingPayload | null>(
    `/content/ratings/${context.contentItemId}/me?${params.toString()}`,
  );
};

export const saveContentRatingRequest = (input: SaveContentRatingInput) =>
  apiRequest<ContentRatingPayload>("/content/ratings", {
    method: "POST",
    body: JSON.stringify(input),
  });
