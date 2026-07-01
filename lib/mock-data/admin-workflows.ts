import type { BadgeTone } from '@/types';

export type DeliverableReviewStatus = 'pending-review' | 'changes-requested' | 'approved';

export interface DeliverableReview {
  id: string;
  entrepreneur: string;
  businessName: string;
  programme: string;
  deliverable: string;
  fileName: string;
  submittedAt: string;
  dueAt: string;
  status: DeliverableReviewStatus;
  reviewer?: string;
}

export const deliverableReviews: DeliverableReview[] = [
  {
    id: 'rev-bmc',
    entrepreneur: 'Kwame Mensah',
    businessName: 'FarmLink GH',
    programme: 'BID Accelerator - Cohort 6',
    deliverable: 'Business Model Canvas',
    fileName: 'FarmLink_BMC_v2.pdf',
    submittedAt: '2025-04-14',
    dueAt: '2025-04-18',
    status: 'pending-review',
  },
  {
    id: 'rev-financials',
    entrepreneur: 'Ama Twum',
    businessName: 'Edify Learn',
    programme: 'BID Accelerator - Cohort 6',
    deliverable: 'Financial Statements Q1',
    fileName: 'Edify_Financials_Q1.xlsx',
    submittedAt: '2025-04-09',
    dueAt: '2025-04-12',
    status: 'pending-review',
  },
  {
    id: 'rev-pitch',
    entrepreneur: 'Nadia Asante',
    businessName: 'HealthFirst',
    programme: 'Investment Readiness for Fintech',
    deliverable: 'Investor Pitch Deck',
    fileName: 'HealthFirst_Pitch_v5.pdf',
    submittedAt: '2025-04-03',
    dueAt: '2025-04-05',
    status: 'changes-requested',
    reviewer: 'Ama Darko',
  },
];

export const deliverableReviewStatusMeta: Record<
  DeliverableReviewStatus,
  { label: string; tone: BadgeTone }
> = {
  'pending-review': { label: 'Pending review', tone: 'amber' },
  'changes-requested': { label: 'Changes requested', tone: 'blue' },
  approved: { label: 'Approved', tone: 'green' },
};

export type AdminSessionStatus = 'confirmed' | 'awaiting-trainer';

export interface AdminSession {
  id: string;
  entrepreneurName: string;
  trainerName: string;
  dateTime: string;
  topic: string;
  status: AdminSessionStatus;
}

export const adminSessions: AdminSession[] = [
  { id: 's1', entrepreneurName: 'Amara Osei', trainerName: 'Kofi Mensah', dateTime: 'Apr 22, 2:00 PM', topic: 'Fundraising strategy', status: 'confirmed' },
  { id: 's2', entrepreneurName: 'Tunde Kola', trainerName: 'Esi Adu', dateTime: 'Apr 23, 10:00 AM', topic: 'Ops & supply chain', status: 'confirmed' },
  { id: 's3', entrepreneurName: 'Nadia Asante', trainerName: 'Mabel Osei', dateTime: 'Apr 24, 1:30 PM', topic: 'Legal structure review', status: 'awaiting-trainer' },
  { id: 's4', entrepreneurName: 'Grace Nana', trainerName: 'Kofi Mensah', dateTime: 'Apr 25, 9:00 AM', topic: 'Investor pitch prep', status: 'awaiting-trainer' },
  { id: 's5', entrepreneurName: 'Kwame Mensah', trainerName: 'Esi Adu', dateTime: 'Apr 28, 11:00 AM', topic: 'Agritech market sizing', status: 'confirmed' },
];

export type ToolRequestStatus = 'under-review' | 'in-development' | 'built' | 'declined';

export interface ToolRequest {
  id: string;
  entrepreneurName: string;
  toolName: string;
  reason: string;
  requestedAgo: string;
  status: ToolRequestStatus;
}

export const toolRequests: ToolRequest[] = [
  {
    id: 'tr1',
    entrepreneurName: 'PayBridge Africa',
    toolName: 'Cap table modelling tool',
    reason: '"Need this ahead of our Series A conversations"',
    requestedAgo: '2 days ago',
    status: 'under-review',
  },
  {
    id: 'tr2',
    entrepreneurName: 'HealthFirst',
    toolName: 'Unit economics calculator',
    reason: '"My mentor recommended this for our programme review"',
    requestedAgo: '4 days ago',
    status: 'under-review',
  },
];

export const toolRequestStatusMeta: Record<
  ToolRequestStatus,
  { label: string; tone: BadgeTone }
> = {
  'under-review': { label: 'Under review', tone: 'amber' },
  'in-development': { label: 'In development', tone: 'blue' },
  built: { label: 'Built - added to library', tone: 'green' },
  declined: { label: 'Declined', tone: 'red' },
};
