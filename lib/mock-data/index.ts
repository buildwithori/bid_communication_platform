import type {
  Deliverable,
  DeliverableGroup,
  Session,
  Tool,
  PlatformDocument,
  ActivityEntry,
  PendingAction,
  ReportingMetrics,
  ProgramBreakdownRow,
} from '@/types';

/**
 * Seed deliverables grouped by programme or "general". The admin
 * deliverables table and the entrepreneur Deliverables page both read
 * from this list.
 */
export const deliverableGroups: DeliverableGroup[] = [
  {
    id: 'g-cohort6',
    label: 'BID Accelerator – Cohort 6',
    programmeId: 'p-accelerator-c6',
    accent: 'bid',
    pendingCount: 3,
    doneCount: 1,
  },
  {
    id: 'g-readiness',
    label: 'Investment Readiness',
    programmeId: 'p-readiness-fintech',
    accent: 'info',
    pendingCount: 0,
    doneCount: 1,
  },
  {
    id: 'g-general',
    label: 'General deliverables',
    accent: 'success',
    pendingCount: 0,
    doneCount: 1,
  },
];

export const deliverables: Deliverable[] = [
  {
    id: 'd-q1',
    name: 'Q1 Progress Report',
    programmeId: 'p-accelerator-c6',
    group: 'programme',
    groupLabel: 'BID Accelerator – Cohort 6',
    submittedAt: '2025-04-02',
    fileName: 'Q1 Report.pdf',
    fileType: 'pdf',
    notes: 'Quarterly update with revenue figures',
    reviewFeedback: 'BID team left feedback — strong revenue trajectory.',
    status: 'reviewed',
  },
  {
    id: 'd-bmc',
    name: 'Business Model Canvas',
    programmeId: 'p-accelerator-c6',
    group: 'programme',
    groupLabel: 'BID Accelerator – Cohort 6',
    dueDate: '2025-04-18',
    status: 'pending',
  },
  {
    id: 'd-finmodel',
    name: 'Financial Model (3yr)',
    programmeId: 'p-accelerator-c6',
    group: 'programme',
    groupLabel: 'BID Accelerator – Cohort 6',
    dueDate: '2025-05-01',
    status: 'pending',
  },
  {
    id: 'd-readiness-deck',
    name: 'Investor Pitch Deck',
    programmeId: 'p-readiness-fintech',
    group: 'programme',
    groupLabel: 'Investment Readiness',
    submittedAt: '2025-03-20',
    fileName: 'PayBridge pitch v4.pdf',
    fileType: 'pdf',
    status: 'reviewed',
  },
  {
    id: 'd-oneway',
    name: 'One-pager business summary',
    group: 'general',
    groupLabel: 'General deliverables',
    submittedAt: '2025-02-15',
    fileName: 'PayBridge one-pager.pdf',
    fileType: 'pdf',
    status: 'reviewed',
  },
];

export const deliverablesForGroup = (groupId: string) => {
  const group = deliverableGroups.find((g) => g.id === groupId);
  if (!group) return [];
  // The mockup's "General" group is keyed off group === 'general'; the
  // programme-specific groups key off programmeId.
  if (group.id === 'g-general') {
    return deliverables.filter((d) => d.group === 'general');
  }
  return deliverables.filter((d) => d.programmeId === group.programmeId);
};

/**
 * Seed sessions / calendar events. `accent` drives the left border
 * colour on the upcoming-sessions cards.
 */
export const sessions: Session[] = [
  {
    id: 's-mentor',
    type: 'mentor-checkin',
    title: 'Mentor check-in – Kofi Mensah',
    trainerId: 't-kofi',
    date: '2025-04-14',
    startTime: '10:00',
    endTime: '10:45',
    status: 'confirmed',
    accent: 'bid',
  },
  {
    id: 's-office',
    type: 'office-hours',
    title: 'BID Office Hours (group)',
    date: '2025-04-16',
    startTime: '14:00',
    endTime: '15:30',
    location: 'virtual',
    status: 'confirmed',
    accent: 'info',
  },
  {
    id: 's-bmc-due',
    type: 'deadline',
    title: 'Business Model Canvas – due',
    date: '2025-04-18',
    accent: 'warning',
    status: 'pending',
    isDeadline: true,
  },
];

/**
 * Seed entrepreneur tools — the Tools page renders these as cards.
 */
export const tools: Tool[] = [
  {
    id: 'tool-bmc',
    name: 'Business Model Canvas',
    description: 'Build and iterate on your BMC directly in the browser.',
    type: 'embed',
    iconKey: 'canvas',
  },
  {
    id: 'tool-finmodel',
    name: 'Financial Model Template',
    description: 'Downloadable 3-year financial model template (Excel/PDF).',
    type: 'pdf',
    iconKey: 'document',
  },
  {
    id: 'tool-pitch-timer',
    name: 'Pitch Timer',
    description: 'Practice your investor pitch with structured timing cues.',
    type: 'embed',
    iconKey: 'timer',
  },
  {
    id: 'tool-pitch-scorer',
    name: 'Pitch Deck Scorer Checklist',
    description:
      "Self-assessment checklist against BID's investor-readiness criteria.",
    type: 'pdf',
    iconKey: 'star',
  },
  {
    id: 'tool-market-sizing',
    name: 'Market Sizing Calculator',
    description: 'Estimate TAM, SAM and SOM with guided inputs.',
    type: 'embed',
    iconKey: 'plus',
  },
  {
    id: 'tool-quarterly',
    name: 'Quarterly Goal Tracker',
    description: 'Printable template for setting and tracking quarterly goals.',
    type: 'pdf',
    iconKey: 'calendar',
  },
];

export const toolById = (id: string) => tools.find((t) => t.id === id);

/**
 * Seed generated documents shown in the admin "Generate documents" table.
 */
export const platformDocuments: PlatformDocument[] = [
  {
    id: 'doc-hf-memo',
    title: 'HealthFirst – Investment Memo',
    type: 'memo',
    entrepreneurId: 'e-healthfirst',
    generatedAt: '2025-04-09',
    status: 'final',
  },
  {
    id: 'doc-pb-memo',
    title: 'PayBridge Africa – Investment Memo',
    type: 'memo',
    entrepreneurId: 'e-paybridge',
    generatedAt: '2025-03-22',
    status: 'draft',
  },
  {
    id: 'doc-c6-q1',
    title: 'Cohort 6 – Q1 Progress Report',
    type: 'report',
    cohort: 'Cohort 6',
    generatedAt: '2025-04-01',
    status: 'sent',
  },
];

/**
 * Seed recent activity for the entrepreneur dashboard.
 */
export const recentActivity: ActivityEntry[] = [
  {
    id: 'act-1',
    text: 'Completed ',
    emphasis: 'Investor Pitch Fundamentals',
    timestamp: '2h ago',
    accent: 'bid',
  },
  {
    id: 'act-2',
    text: 'BID Team left feedback on ',
    emphasis: 'Q1 Report.pdf',
    timestamp: 'Yesterday',
    accent: 'info',
  },
  {
    id: 'act-3',
    text: '',
    emphasis: 'Business Model Canvas',
    timestamp: 'Apr 11',
    accent: 'warning',
    // The mockup renders this as "Business Model Canvas due in 3 days".
  },
  {
    id: 'act-4',
    text: 'Session booked: ',
    emphasis: 'Office Hours',
    timestamp: 'Apr 8',
    accent: 'neutral',
  },
];

/**
 * Admin dashboard pending actions list.
 */
export const pendingActions: PendingAction[] = [
  { id: 'pa-1', label: 'Deliverables awaiting review', count: 12, tone: 'amber' },
  { id: 'pa-2', label: 'Self-registered, unassigned', count: 3, tone: 'red' },
  { id: 'pa-3', label: 'Tool requests pending', count: 2, tone: 'blue' },
  { id: 'pa-4', label: 'Documents to generate', count: 4, tone: 'neutral' },
];

/**
 * Admin reporting aggregate metrics (one quarter).
 */
export const reportingMetrics: ReportingMetrics = {
  jobsCreated: 62,
  jobsWomen: 38,
  jobsMen: 24,
  fundsMobilisedUsd: 340000,
  entrepreneursWithFunds: 12,
  updateSubmissionRate: 58,
  trainingCompletionRate: 61,
  totalEntrepreneurs: 47,
  submittedUpdatesThisQuarter: 27,
};

export const jobsByProgram: ProgramBreakdownRow[] = [
  { programName: 'BID Accelerator', value: 38, label: '38', accent: 'bid', percent: 60 },
  { programName: 'Investment Readiness', value: 19, label: '19', accent: 'info', percent: 30 },
  { programName: 'Women Econ. Empowerment', value: 5, label: '5', accent: 'success', percent: 10 },
];

export const fundsByProgram: ProgramBreakdownRow[] = [
  { programName: 'BID Accelerator', value: 150000, label: '$150k', accent: 'bid', percent: 45 },
  { programName: 'Investment Readiness', value: 190000, label: '$190k', accent: 'info', percent: 55 },
  { programName: 'Women Econ. Empowerment', value: 0, label: '$0', accent: 'success', percent: 0 },
];

/**
 * Admin reporting — entrepreneurs whose periodic updates are overdue.
 */
export const overdueUpdaters = [
  {
    entrepreneurId: 'e-farmlink',
    lastUpdateLabel: 'Q3 2024',
    programmeId: 'p-accelerator-c6',
  },
  {
    entrepreneurId: 'e-edify',
    lastUpdateLabel: 'Never submitted',
    programmeId: 'p-accelerator-c6',
  },
  {
    entrepreneurId: 'e-healthfirst',
    lastUpdateLabel: 'Q4 2024',
    programmeId: 'p-readiness-fintech',
  },
];

/** Per-programme reporting snapshots used when a specific programme is selected. */
export const reportingByProgramme: Record<string, {
  metrics: ReportingMetrics;
  jobsByProgram: ProgramBreakdownRow[];
  fundsByProgram: ProgramBreakdownRow[];
}> = {
  'p-accelerator-c6': {
    metrics: {
      jobsCreated: 38,
      jobsWomen: 22,
      jobsMen: 16,
      fundsMobilisedUsd: 150000,
      entrepreneursWithFunds: 6,
      updateSubmissionRate: 56,
      trainingCompletionRate: 61,
      totalEntrepreneurs: 18,
      submittedUpdatesThisQuarter: 10,
    },
    jobsByProgram: [
      { programName: 'BID Accelerator – Cohort 6', value: 38, label: '38', accent: 'bid', percent: 100 },
    ],
    fundsByProgram: [
      { programName: 'BID Accelerator – Cohort 6', value: 150000, label: '$150k', accent: 'bid', percent: 100 },
    ],
  },
  'p-readiness-fintech': {
    metrics: {
      jobsCreated: 19,
      jobsWomen: 10,
      jobsMen: 9,
      fundsMobilisedUsd: 190000,
      entrepreneursWithFunds: 5,
      updateSubmissionRate: 67,
      trainingCompletionRate: 20,
      totalEntrepreneurs: 9,
      submittedUpdatesThisQuarter: 6,
    },
    jobsByProgram: [
      { programName: 'Investment Readiness for Fintech', value: 19, label: '19', accent: 'info', percent: 100 },
    ],
    fundsByProgram: [
      { programName: 'Investment Readiness for Fintech', value: 190000, label: '$190k', accent: 'info', percent: 100 },
    ],
  },
  'p-wee': {
    metrics: {
      jobsCreated: 5,
      jobsWomen: 5,
      jobsMen: 0,
      fundsMobilisedUsd: 0,
      entrepreneursWithFunds: 0,
      updateSubmissionRate: 50,
      trainingCompletionRate: 12,
      totalEntrepreneurs: 20,
      submittedUpdatesThisQuarter: 10,
    },
    jobsByProgram: [
      { programName: 'Women Economic Empowerment', value: 5, label: '5', accent: 'success', percent: 100 },
    ],
    fundsByProgram: [
      { programName: 'Women Economic Empowerment', value: 0, label: '$0', accent: 'success', percent: 0 },
    ],
  },
};
