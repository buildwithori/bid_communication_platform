import { apiRequest } from "../client";
import type {
  DeliverableFeedbackPage,
  DeliverableGroupPage,
  DeliverableGroupQuery,
  DeliverableInstance,
  DeliverableInstancePage,
  DeliverableQuery,
  DeliverableReview,
  DeliverableReviewQueuePage,
  DeliverableSubmissionPage,
  ReviewDeliverableVariables,
  SubmitDeliverableVariables,
  UpdateDeliverableDueDateVariables,
} from "./types";

function toQueryString(query?: DeliverableQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.status) params.set("status", query.status);
  if (query?.programmeId) params.set("programmeId", query.programmeId);
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? "?" + value : "";
}

export const listDeliverableGroupsRequest = (query?: DeliverableGroupQuery) =>
  apiRequest<DeliverableGroupPage>(
    "/deliverable-groups" + toQueryString(query),
  );

export const listDeliverableInstancesRequest = (query?: DeliverableQuery) =>
  apiRequest<DeliverableInstancePage>(
    "/deliverable-instances" + toQueryString(query),
  );

export const listDeliverableReviewQueueRequest = (query?: DeliverableQuery) =>
  apiRequest<DeliverableReviewQueuePage>(
    "/deliverable-reviews" + toQueryString(query),
  );

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
