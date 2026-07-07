import type { BadgeTone } from '@/types';

export type DeliverableReviewStatus = 'pending-review' | 'changes-requested' | 'approved';

export interface DeliverableReview {
  id: string;
  entrepreneurId: string;
  deliverableId: string;
  entrepreneur: string;
  businessName: string;
  programme: string;
  deliverable: string;
  fileName: string;
  submittedAt: string;
  dueAt: string;
  status: DeliverableReviewStatus;
  reviewer?: string;
  latestFeedback?: string;
  feedbackReadAt?: string;
}

export const deliverableReviews: DeliverableReview[] = [
  {
    id: 'rev-q1-paybridge',
    entrepreneurId: 'e-paybridge',
    deliverableId: 'd-q1',
    entrepreneur: 'Amara Osei',
    businessName: 'PayBridge Africa Ltd',
    programme: 'BID Accelerator - Cohort 6',
    deliverable: 'Q1 Progress Report',
    fileName: 'Q1 Report.pdf',
    submittedAt: '2025-04-02',
    dueAt: '2025-04-05',
    status: 'approved',
    reviewer: 'Ama Darko',
    latestFeedback: 'Strong revenue trajectory. BID has accepted this report.',
    feedbackReadAt: '2025-04-06',
  },
  {
    id: 'rev-finmodel-paybridge',
    entrepreneurId: 'e-paybridge',
    deliverableId: 'd-finmodel',
    entrepreneur: 'Amara Osei',
    businessName: 'PayBridge Africa Ltd',
    programme: 'BID Accelerator - Cohort 6',
    deliverable: 'Financial Model (3yr)',
    fileName: 'PayBridge_financial_model_v1.xlsx',
    submittedAt: '2026-07-01',
    dueAt: '2026-07-20',
    status: 'changes-requested',
    reviewer: 'Ama Darko',
    latestFeedback: 'Please add monthly cash-flow assumptions and separate revenue lines by customer segment.',
  },
  {
    id: 'rev-bmc-farmlink',
    entrepreneurId: 'e-farmlink',
    deliverableId: 'd-bmc-farmlink',
    entrepreneur: 'Kwame Mensah',
    businessName: 'FarmLink GH',
    programme: 'BID Accelerator - Cohort 6',
    deliverable: 'Business Model Canvas',
    fileName: 'FarmLink_BMC_v2.pdf',
    submittedAt: '2026-07-05',
    dueAt: '2026-07-13',
    status: 'pending-review',
  },
  {
    id: 'rev-financials-edify',
    entrepreneurId: 'e-edify',
    deliverableId: 'd-financials-edify',
    entrepreneur: 'Ama Twum',
    businessName: 'Edify Learn',
    programme: 'BID Accelerator - Cohort 6',
    deliverable: 'Financial Statements Q1',
    fileName: 'Edify_Financials_Q1.xlsx',
    submittedAt: '2026-07-03',
    dueAt: '2026-07-02',
    status: 'pending-review',
  },
];

export const deliverableReviewStatusMeta: Record<
  DeliverableReviewStatus,
  { label: string; tone: BadgeTone }
> = {
  'pending-review': { label: 'Pending review', tone: 'amber' },
  'changes-requested': { label: 'Changes required', tone: 'blue' },
  approved: { label: 'Approved', tone: 'green' },
};

export type AdminSessionStatus = 'confirmed' | 'awaiting-trainer';

export interface AdminSession {
  id: string;
  entrepreneurId: string;
  trainerId?: string;
  entrepreneurName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime?: string;
  sessionType: 'Mentoring' | 'Group session' | 'Investor prep';
  topic: string;
  status: AdminSessionStatus;
  source: 'entrepreneur-request' | 'admin-scheduled';
}

export const adminSessions: AdminSession[] = [
  {
    id: 's-mentor',
    entrepreneurId: 'e-paybridge',
    trainerId: 't-kofi',
    entrepreneurName: 'Amara Osei',
    trainerName: 'Kofi Mensah',
    date: '2026-07-08',
    startTime: '10:00',
    endTime: '10:45',
    sessionType: 'Mentoring',
    topic: 'Mentor check-in',
    status: 'confirmed',
    source: 'entrepreneur-request',
  },
  {
    id: 's-office',
    entrepreneurId: 'e-paybridge',
    entrepreneurName: 'Amara Osei',
    trainerName: 'BID programme team',
    date: '2026-07-10',
    startTime: '14:00',
    endTime: '15:30',
    sessionType: 'Group session',
    topic: 'BID Office Hours',
    status: 'confirmed',
    source: 'admin-scheduled',
  },
  {
    id: 's-investor-prep',
    entrepreneurId: 'e-paybridge',
    entrepreneurName: 'Amara Osei',
    trainerName: 'BID investment team',
    date: '2026-07-15',
    startTime: '11:00',
    endTime: '12:00',
    sessionType: 'Investor prep',
    topic: 'Investor prep session',
    status: 'confirmed',
    source: 'entrepreneur-request',
  },
  {
    id: 's-farmlink-sizing',
    entrepreneurId: 'e-farmlink',
    trainerId: 't-esi',
    entrepreneurName: 'Kwame Mensah',
    trainerName: 'Esi Adu',
    date: '2026-07-16',
    startTime: '09:00',
    endTime: '09:45',
    sessionType: 'Mentoring',
    topic: 'Agritech market sizing',
    status: 'awaiting-trainer',
    source: 'entrepreneur-request',
  },
];

export type ToolRequestStatus = 'under-review' | 'in-development' | 'built' | 'declined';

export interface ToolRequest {
  id: string;
  businessName: string;
  requesterName: string;
  programme: string;
  toolName: string;
  category: string;
  reason: string;
  requestedAt: string;
  requestedAgo: string;
  neededBy?: string;
  adminNote?: string;
  status: ToolRequestStatus;
}

export const toolRequests: ToolRequest[] = [
  {
    id: 'tr1',
    businessName: 'PayBridge Africa Ltd',
    requesterName: 'Amara Osei',
    programme: 'BID Accelerator - Cohort 6',
    toolName: 'Cap table modelling tool',
    category: 'Fundraising',
    reason: 'We need to model founder dilution, SAFE notes, and new investor ownership before our Series A conversations.',
    requestedAt: '2026-07-04',
    requestedAgo: '2 days ago',
    neededBy: '2026-07-18',
    status: 'under-review',
  },
  {
    id: 'tr2',
    businessName: 'HealthFirst',
    requesterName: 'Nadia Asante',
    programme: 'Investment Readiness',
    toolName: 'Unit economics calculator',
    category: 'Finance',
    reason: 'My mentor recommended a simple way to calculate CAC, gross margin, contribution margin, and payback period for our review.',
    requestedAt: '2026-07-02',
    requestedAgo: '4 days ago',
    neededBy: '2026-07-25',
    status: 'under-review',
  },
  {
    id: 'tr3',
    businessName: 'FarmLink GH',
    requesterName: 'Kwame Mensah',
    programme: 'BID Accelerator - Cohort 6',
    toolName: 'Grant eligibility checklist',
    category: 'Operations',
    reason: 'We keep missing grant requirements across different donors. A checklist would help us prepare documents earlier.',
    requestedAt: '2026-06-28',
    requestedAgo: '8 days ago',
    adminNote: 'Useful, but similar checklist exists in the training library. Review whether this should be content instead of a new tool.',
    status: 'in-development',
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
