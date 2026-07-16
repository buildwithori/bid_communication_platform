export type DeliverableStatus =
  | "not_submitted"
  | "submitted"
  | "changes_required"
  | "approved"
  | "overdue";
export type DeliverableDueType = "fixed_date" | "module_completion" | "recurring";
export type DeliverableReviewDecision = "approved" | "changes_required";
export type DeliverableRecurringCadence = "monthly" | "quarterly" | "six_monthly";

export type DeliverableQuery = {
  search?: string;
  status?: DeliverableStatus;
  programmeId?: string;
  dateFrom?: string;
  dateTo?: string;
  overdue?: boolean;
  take?: number;
  cursor?: string;
};

export type DeliverableFile = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  status: string;
};

export type DeliverableUser = { id: string; name: string; email: string };

export type DeliverableReview = {
  id: string;
  submissionId: string;
  decision: DeliverableReviewDecision;
  feedback: string;
  reviewerRole: "admin" | "trainer";
  reviewer: DeliverableUser;
  readAt: string | null;
  createdAt: string;
};

export type DeliverableSubmission = {
  id: string;
  note: string | null;
  submittedAt: string;
  submittedBy: DeliverableUser;
  reviewCount: number;
  latestReview: DeliverableReview | null;
  file: DeliverableFile;
};

export type DeliverableInstance = {
  id: string;
  ruleId: string;
  programmeId: string;
  entrepreneurUserId: string;
  deliverable: string;
  status: DeliverableStatus;
  dueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  dueSource: "manual_override" | "programme_rule";
  dueUpdatedAt: string | null;
  dueUpdatedBy: DeliverableUser | null;
  dueUpdateReason: string | null;
  rule: {
    id: string;
    name: string;
    dueType: DeliverableDueType;
    dueDate: string | null;
    dueAfterModule: { id: string; title: string } | null;
    recurringCadence: DeliverableRecurringCadence | null;
    requiredForScope: "all" | "stage";
    requiredStage: { id: string; name: string; key: string } | null;
  };
  programme: { id: string; name: string; accessType: "free" | "assigned" };
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
  latestSubmission: DeliverableSubmission | null;
  latestReview: DeliverableReview | null;
  submissionCount: number;
  hasUnreadFeedback: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DeliverableReviewQueueItem = DeliverableInstance & {
  submittedAt: string | null;
  waitingDays: number | null;
};

export type DeliverableFeedback = DeliverableReview & {
  submission: {
    id: string;
    submittedAt: string;
    file: DeliverableFile;
  };
};

export type DeliverableStatusSummary = Record<DeliverableStatus, number>;
export type DeliverablePage<T> = {
  items: T[];
  nextCursor: string | null;
  totalItems: number;
};
export type DeliverableInstancePage = DeliverablePage<DeliverableInstance> & {
  summary: DeliverableStatusSummary;
};
export type DeliverableReviewQueuePage = DeliverablePage<DeliverableReviewQueueItem> & {
  summary: DeliverableStatusSummary;
  overdueReviewCount: number;
};
export type DeliverableSubmissionPage = DeliverablePage<DeliverableSubmission>;
export type DeliverableFeedbackPage = DeliverablePage<DeliverableFeedback>;

export type SubmitDeliverableVariables = {
  instanceId: string;
  fileAssetId: string;
  note?: string;
};
export type ReviewDeliverableVariables = {
  submissionId: string;
  decision: DeliverableReviewDecision;
  feedback?: string;
};
export type UpdateDeliverableDueDateVariables = {
  instanceId: string;
  dueDate: string;
  reason?: string;
};

export type DeliverableGroupQuery = {
  search?: string;
  programmeId?: string;
  view?: "needs_action" | "under_review" | "approved";
  take?: number;
  cursor?: string;
};
export type DeliverableGroup = {
  id: string;
  name: string;
  accessType: "free" | "assigned";
  counts: DeliverableStatusSummary;
  total: number;
  needsAction: number;
  unreadFeedback: number;
  nextDueDate: string | null;
};
export type DeliverableGroupPage = DeliverablePage<DeliverableGroup> & {
  summary: DeliverableStatusSummary;
  unreadFeedbackTotal: number;
};
