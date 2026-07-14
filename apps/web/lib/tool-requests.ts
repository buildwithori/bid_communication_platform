import type { BadgeTone } from '@/types';
import type { ApiToolRequestStatus, ToolRequestRecord } from './api/tool-requests';

export type ToolRequestStatus = 'under-review' | 'in-development' | 'built' | 'declined';

export type ToolRequest = {
  id: string;
  businessName: string;
  requesterName: string;
  programme: string;
  toolName: string;
  category: string;
  categoryId: string;
  reason: string;
  requestedAt: string;
  requestedAgo: string;
  neededBy?: string;
  adminNote?: string;
  decidedBy?: string;
  decidedAt?: string;
  linkedToolId?: string;
  linkedToolName?: string;
  status: ToolRequestStatus;
};

export const apiToUiToolRequestStatus: Record<ApiToolRequestStatus, ToolRequestStatus> = {
  under_review: 'under-review',
  in_development: 'in-development',
  built: 'built',
  declined: 'declined',
};

export const uiToApiToolRequestStatus: Record<ToolRequestStatus, ApiToolRequestStatus> = {
  'under-review': 'under_review',
  'in-development': 'in_development',
  built: 'built',
  declined: 'declined',
};

export const toolRequestStatusMeta: Record<ToolRequestStatus, { label: string; tone: BadgeTone }> = {
  'under-review': { label: 'Under review', tone: 'amber' },
  'in-development': { label: 'In development', tone: 'blue' },
  built: { label: 'Built - added to library', tone: 'green' },
  declined: { label: 'Declined', tone: 'red' },
};

export function mapToolRequestRecordToUi(record: ToolRequestRecord): ToolRequest {
  return {
    id: record.id,
    businessName: record.entrepreneur.businessName,
    requesterName: record.entrepreneur.name,
    programme: formatProgrammeSummary(record.entrepreneur.programmes),
    toolName: record.title,
    category: record.toolArea.name,
    categoryId: record.toolArea.id,
    reason: record.businessNeed,
    requestedAt: record.createdAt,
    requestedAgo: formatRelativeDate(record.createdAt),
    neededBy: record.neededBy ?? undefined,
    adminNote: record.adminDecisionNote ?? undefined,
    decidedBy: record.decidedBy?.name,
    decidedAt: record.decidedAt ?? undefined,
    linkedToolId: record.linkedTool?.id,
    linkedToolName: record.linkedTool?.name,
    status: apiToUiToolRequestStatus[record.status],
  };
}

function formatProgrammeSummary(programmes: Array<{ name: string }>) {
  if (programmes.length === 0) return 'Free resources only';
  if (programmes.length === 1) return programmes[0].name;
  return `${programmes[0].name} + ${programmes.length - 1} more`;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.max(0, Math.floor((now.getTime() - date.getTime()) / msPerDay));
  if (diff === 0) return 'today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}
