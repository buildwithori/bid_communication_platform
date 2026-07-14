import { apiRequest } from './client';

export type DeliverableStatus = 'not_submitted' | 'submitted' | 'changes_required' | 'approved' | 'overdue';
export type DeliverableDueType = 'fixed_date' | 'module_completion' | 'recurring';
export type DeliverableReviewDecision = 'approved' | 'changes_required';

export type DeliverableQuery = {
  search?: string;
  status?: DeliverableStatus;
  programmeId?: string;
  take?: number;
  cursor?: string;
};

export type DeliverableFile = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  storageKey: string;
  status: string;
};

export type DeliverableReview = {
  id: string;
  submissionId: string;
  decision: DeliverableReviewDecision;
  feedback: string;
  reviewerRole: 'admin' | 'trainer' | 'entrepreneur';
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
  readAt: string | null;
  createdAt: string;
};

export type DeliverableInstance = {
  id: string;
  ruleId: string;
  programmeId: string;
  entrepreneurUserId: string;
  deliverable: string;
  status: DeliverableStatus;
  dueDate: string;
  dueSource: 'manual_override' | 'programme_rule';
  dueUpdatedAt: string | null;
  dueUpdatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  dueUpdateReason: string | null;
  rule: {
    id: string;
    name: string;
    dueType: DeliverableDueType;
    dueDate: string | null;
    dueAfterModule: { id: string; title: string } | null;
    recurringCadence: 'monthly' | 'quarterly' | 'six_monthly' | null;
    requiredForScope: 'all' | 'stage';
    requiredStage: { id: string; name: string; key: string } | null;
  };
  programme: {
    id: string;
    name: string;
    accessType: 'free' | 'assigned';
  };
  entrepreneur: {
    userId: string;
    name: string;
    email: string;
    businessId: string | null;
    businessName: string;
    country: string | null;
    sector: { id: string; name: string; key: string } | null;
    stage: { id: string; name: string; key: string } | null;
  };
  latestSubmission: {
    id: string;
    note: string | null;
    submittedAt: string;
    submittedBy: { id: string; name: string; email: string };
    file: DeliverableFile;
  } | null;
  latestReview: DeliverableReview | null;
  reviewHistory: DeliverableReview[];
  hasUnreadFeedback: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DeliverableReviewQueueItem = DeliverableInstance & {
  submittedAt: string | null;
  waitingDays: number | null;
  feedbackReadAt: string | null;
};

function toQueryString(query?: DeliverableQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.status) params.set('status', query.status);
  if (query?.programmeId) params.set('programmeId', query.programmeId);
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listDeliverableInstances(query?: DeliverableQuery) {
  return apiRequest<{ items: DeliverableInstance[]; nextCursor: string | null }>(
    `/deliverable-instances${toQueryString(query)}`,
  );
}

export function listDeliverableReviews(query?: DeliverableQuery) {
  return apiRequest<{ items: DeliverableReviewQueueItem[]; nextCursor: string | null }>(
    `/deliverable-reviews${toQueryString(query)}`,
  );
}




export function submitDeliverableInstance(
  instanceId: string,
  payload: { originalFilename: string; mimeType?: string; sizeBytes?: number; note?: string },
) {
  return apiRequest<DeliverableInstance>(`/deliverable-instances/${instanceId}/submissions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function markDeliverableReviewRead(reviewId: string) {
  return apiRequest<{ id: string; readAt: string }>(`/deliverable-reviews/${reviewId}/read`, {
    method: 'POST',
  });
}

export function reviewDeliverableSubmission(
  submissionId: string,
  payload: { decision: DeliverableReviewDecision; feedback?: string },
) {
  return apiRequest<{ id: string }>(`/deliverable-submissions/${submissionId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDeliverableDueDate(
  instanceId: string,
  payload: { dueDate: string; reason?: string },
) {
  return apiRequest<DeliverableInstance>(`/deliverable-instances/${instanceId}/due-date`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
