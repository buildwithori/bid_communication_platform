import type { DeliverableReviewQueueItem } from '@/lib/api/deliverables';
import type { BadgeTone } from '@/types';

export type DeliverableReviewStatus = 'pending-review' | 'changes-requested' | 'approved';

export type DeliverableReviewRow = {
  id: string;
  entrepreneurId: string;
  deliverableId: string;
  entrepreneur: string;
  businessName: string;
  programme: string;
  programmeId: string;
  deliverable: string;
  fileName: string;
  submittedAt: string;
  dueAt: string;
  dueRule: string;
  dueSource: 'programme-requirement' | 'manual-override';
  dueUpdatedAt?: string;
  dueUpdatedBy?: string;
  status: DeliverableReviewStatus;
  reviewer?: string;
  latestFeedback?: string;
  feedbackReadAt?: string;
};

export const deliverableReviewStatusMeta: Record<DeliverableReviewStatus, { label: string; tone: BadgeTone }> = {
  'pending-review': { label: 'Pending review', tone: 'amber' },
  'changes-requested': { label: 'Changes required', tone: 'blue' },
  approved: { label: 'Approved', tone: 'green' },
};

export function mapDeliverableReviewRow(row: DeliverableReviewQueueItem): DeliverableReviewRow {
  const latestSubmission = row.latestSubmission;
  const latestReview = row.latestReview;
  return {
    id: row.id,
    entrepreneurId: row.entrepreneur.userId,
    deliverableId: row.ruleId,
    entrepreneur: row.entrepreneur.name,
    businessName: row.entrepreneur.businessName,
    programme: row.programme.name,
    programmeId: row.programme.id,
    deliverable: row.deliverable,
    fileName: latestSubmission?.file.originalFilename ?? 'No file attached',
    submittedAt: latestSubmission?.submittedAt ?? row.updatedAt,
    dueAt: row.dueDate,
    dueRule: dueRuleLabel(row),
    dueSource: row.dueSource === 'manual_override' ? 'manual-override' : 'programme-requirement',
    dueUpdatedAt: row.dueUpdatedAt ?? undefined,
    dueUpdatedBy: row.dueUpdatedBy?.name,
    status: mapStatus(row.status),
    reviewer: latestReview?.reviewer.name,
    latestFeedback: latestReview?.feedback,
    feedbackReadAt: latestReview?.readAt ?? undefined,
  };
}

export function reviewTone(row: DeliverableReviewRow, today: Date): BadgeTone {
  if (row.status === 'pending-review' && new Date(row.dueAt) < today) return 'red';
  return deliverableReviewStatusMeta[row.status].tone;
}

export function reviewLabel(row: DeliverableReviewRow, today: Date) {
  if (row.status === 'pending-review' && new Date(row.dueAt) < today) return 'Overdue review';
  return deliverableReviewStatusMeta[row.status].label;
}

function mapStatus(status: DeliverableReviewQueueItem['status']): DeliverableReviewStatus {
  if (status === 'approved') return 'approved';
  if (status === 'changes_required') return 'changes-requested';
  return 'pending-review';
}

function cadenceLabel(cadence: DeliverableReviewQueueItem['rule']['recurringCadence']) {
  if (cadence === 'monthly') return 'Monthly recurring requirement';
  if (cadence === 'quarterly') return 'Quarterly recurring requirement';
  if (cadence === 'six_monthly') return 'Six-month recurring requirement';
  return 'Recurring programme requirement';
}

function dueRuleLabel(row: DeliverableReviewQueueItem) {
  if (row.rule.dueType === 'module_completion') {
    return row.rule.dueAfterModule ? `After ${row.rule.dueAfterModule.title}` : 'After module completion';
  }
  if (row.rule.dueType === 'recurring') return cadenceLabel(row.rule.recurringCadence);
  return 'Fixed programme due date';
}
