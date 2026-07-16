import type { DeliverableInstance } from '@/lib/api/deliverables';
import type { Deliverable, DeliverableStatus } from '@/types';

export type EntrepreneurDeliverableGroup = {
  id: string;
  label: string;
  description: string;
  programmeId: string;
  accent: 'bid' | 'info' | 'success';
};

const accentCycle: Array<EntrepreneurDeliverableGroup['accent']> = ['bid', 'info', 'success'];

export function mapDeliverableInstanceToEntrepreneurDeliverable(
  instance: DeliverableInstance,
): Deliverable {
  const latestSubmission = instance.latestSubmission;
  const latestReview = instance.latestReview;

  return {
    id: instance.id,
    name: instance.deliverable,
    programmeId: instance.programmeId,
    group: 'programme',
    groupLabel: instance.programme.name,
    dueDate: instance.dueDate,
    submittedAt: latestSubmission?.submittedAt,
    fileName: latestSubmission?.file.originalFilename,
    fileType: latestSubmission?.file.originalFilename
      ? inferFileType(latestSubmission.file.originalFilename)
      : undefined,
    notes: latestSubmission?.note ?? undefined,
    reviewFeedback: latestReview?.feedback,
    reviewer: latestReview?.reviewer.name,
    feedbackHistory: latestReview
      ? [{
          id: latestReview.id,
          message: latestReview.feedback,
          reviewer: latestReview.reviewer.name,
          createdAt: latestReview.createdAt,
          readAt: latestReview.readAt ?? undefined,
        }]
      : [],
    status: mapDeliverableStatus(instance.status),
  };
}

export function getEntrepreneurDeliverableGroups(
  instances: DeliverableInstance[],
): EntrepreneurDeliverableGroup[] {
  const groups = new Map<string, EntrepreneurDeliverableGroup>();

  instances.forEach((instance) => {
    if (groups.has(instance.programmeId)) return;
    groups.set(instance.programmeId, {
      id: instance.programmeId,
      programmeId: instance.programmeId,
      label: instance.programme.name,
      description:
        instance.programme.accessType === 'free'
          ? 'Free programme deliverables available to entrepreneurs.'
          : 'Programme submissions, feedback, and approval status.',
      accent: accentCycle[groups.size % accentCycle.length] ?? 'bid',
    });
  });

  return Array.from(groups.values());
}

function mapDeliverableStatus(status: DeliverableInstance['status']): DeliverableStatus {
  if (status === 'not_submitted') return 'pending';
  if (status === 'changes_required') return 'changes-requested';
  if (status === 'approved') return 'reviewed';
  return status;
}

function inferFileType(fileName: string): Deliverable['fileType'] {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'pptx') return 'pptx';
  if (extension === 'docx') return 'docx';
  if (extension === 'xlsx') return 'xlsx';
  return 'pdf';
}
