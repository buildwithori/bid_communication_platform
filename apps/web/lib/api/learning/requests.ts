import { apiRequest } from "../client";
import type {
  LearnerContentProgressInput,
  LearnerProgressLookup,
  LearnerProgressQuery,
  SyncLearnerProgressResult,
  TrainingCatalogueSummary,
} from "./types";

function queryString(query: LearnerProgressQuery) {
  const params = new URLSearchParams({ programmeId: query.programmeId });
  if (query.entrepreneurUserId) {
    params.set("entrepreneurUserId", query.entrepreneurUserId);
  }
  if (query.moduleId) params.set("moduleId", query.moduleId);
  if (query.contentItemId) params.set("contentItemId", query.contentItemId);
  return `?${params.toString()}`;
}

export const getTrainingCatalogueSummaryRequest = () =>
  apiRequest<TrainingCatalogueSummary>("/learning/catalogue/summary");

export const getLearnerProgressRequest = (query: LearnerProgressQuery) =>
  apiRequest<LearnerProgressLookup>(
    `/learning/progress${queryString(query)}`,
  );

export const syncLearnerProgressRequest = (
  items: LearnerContentProgressInput[],
) =>
  apiRequest<SyncLearnerProgressResult>("/learning/progress/sync", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
