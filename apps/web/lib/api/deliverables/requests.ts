import { apiRequest } from "../client";
import type {
  DeliverableFeedbackPage,
  DeliverableGroupPage,
  DeliverableGroupQuery,
  DeliverableGroupSummary,
  DeliverableInstance,
  DeliverableInstancePage,
  DeliverableInstanceSummary,
  DeliverableQuery,
  DeliverableReview,
  DeliverableReviewQueueItem,
  DeliverableReviewQueuePage,
  DeliverableReviewSummary,
  DeliverableSubmissionPage,
  ReviewDeliverableVariables,
  SubmitDeliverableVariables,
  UpdateDeliverableDueDateVariables,
} from "./types";

function toQueryString(query?: DeliverableQuery | DeliverableGroupQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if ("programmeId" in (query ?? {}) && query?.programmeId) params.set("programmeId", query.programmeId);
  if (query && "dateFrom" in query && query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query && "dateTo" in query && query.dateTo) params.set("dateTo", query.dateTo);
  if (query && "view" in query && query.view) params.set("view", query.view);
  if (query && "status" in query && query.status) params.set("status", query.status);
  if (query && "overdue" in query && query.overdue) params.set("overdue", "true");
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? "?" + value : "";
}

export const listDeliverableGroupsRequest = (query?: DeliverableGroupQuery) =>
  apiRequest<DeliverableGroupPage>(
    "/deliverable-groups" + toQueryString(query),
  );
export const getDeliverableGroupSummaryRequest = () =>
  apiRequest<DeliverableGroupSummary>("/deliverable-groups/summary");

export const listDeliverableInstancesRequest = (query?: DeliverableQuery) =>
  apiRequest<DeliverableInstancePage>(
    "/deliverable-instances" + toQueryString(query),
  );
export const getDeliverableInstanceSummaryRequest = (programmeId?: string) =>
  apiRequest<DeliverableInstanceSummary>(
    `/deliverable-instances/summary${programmeId ? `?programmeId=${encodeURIComponent(programmeId)}` : ""}`,
  );

export const getDeliverableInstanceRequest = (id: string) =>
  apiRequest<DeliverableReviewQueueItem>("/deliverable-instances/" + id);

export const listDeliverableReviewQueueRequest = (query?: DeliverableQuery) =>
  apiRequest<DeliverableReviewQueuePage>(
    "/deliverable-reviews" + toQueryString(query),
  );
export const getDeliverableReviewSummaryRequest = () =>
  apiRequest<DeliverableReviewSummary>("/deliverable-reviews/summary");

export const listDeliverableSubmissionsRequest = (
  instanceId: string,
  query?: Pick<DeliverableQuery, "take" | "cursor">,
) =>
  apiRequest<DeliverableSubmissionPage>(
    "/deliverable-instances/" + instanceId + "/submissions" + toQueryString(query),
  );

export const listDeliverableFeedbackRequest = (
  instanceId: string,
  query?: Pick<DeliverableQuery, "take" | "cursor">,
) =>
  apiRequest<DeliverableFeedbackPage>(
    "/deliverable-instances/" + instanceId + "/feedback" + toQueryString(query),
  );

export const submitDeliverableRequest = ({
  instanceId,
  fileAssetId,
  note,
}: SubmitDeliverableVariables) =>
  apiRequest<DeliverableInstance>(
    "/deliverable-instances/" + instanceId + "/submissions",
    { method: "POST", body: JSON.stringify({ fileAssetId, note }) },
  );

export const reviewDeliverableRequest = ({
  submissionId,
  decision,
  feedback,
}: ReviewDeliverableVariables) =>
  apiRequest<DeliverableReview>(
    "/deliverable-submissions/" + submissionId + "/reviews",
    { method: "POST", body: JSON.stringify({ decision, feedback }) },
  );

export const markDeliverableReviewReadRequest = (reviewId: string) =>
  apiRequest<{ id: string; readAt: string }>(
    "/deliverable-reviews/" + reviewId + "/read",
    { method: "POST" },
  );

export const updateDeliverableDueDateRequest = ({
  instanceId,
  dueDate,
  reason,
}: UpdateDeliverableDueDateVariables) =>
  apiRequest<DeliverableInstance>(
    "/deliverable-instances/" + instanceId + "/due-date",
    { method: "PATCH", body: JSON.stringify({ dueDate, reason }) },
  );
