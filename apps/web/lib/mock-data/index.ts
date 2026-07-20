import type {
  Deliverable,
  DeliverableGroup,
  Session,
  Tool,
  ActivityEntry,
  PendingAction,
  ReportingMetrics,
  ProgramBreakdownRow,
} from "@/types";

/**
 * Seed deliverables grouped by programme or "general". The admin
 * deliverables table and the entrepreneur Deliverables page both read
 * from this list.
 */
export const deliverableGroups: DeliverableGroup[] = [
  {
    id: "g-cohort6",
    label: "BID Accelerator – Cohort 6",
    programmeId: "p-accelerator-c6",
    accent: "bid",
    pendingCount: 3,
    doneCount: 1,
  },
  {
    id: "g-readiness",
    label: "Investment Readiness",
    programmeId: "p-readiness-fintech",
    accent: "info",
    pendingCount: 0,
    doneCount: 1,
  },
  {
    id: "g-general",
    label: "General deliverables",
    accent: "success",
    pendingCount: 0,
    doneCount: 1,
  },
];

export const deliverables: Deliverable[] = [
  {
    id: "d-q1",
    name: "Q1 Progress Report",
    programmeId: "p-accelerator-c6",
    group: "programme",
    groupLabel: "BID Accelerator – Cohort 6",
    submittedAt: "2025-04-02",
    fileName: "Q1 Report.pdf",
    fileType: "pdf",
    notes: "Quarterly update with revenue figures",
    reviewFeedback: "BID team left feedback — strong revenue trajectory.",
    feedbackHistory: [
      {
        id: "fb-q1-approved",
        message: "Strong revenue trajectory. BID has accepted this report.",
        reviewer: "Ama Darko",
        createdAt: "2025-04-05",
        readAt: "2025-04-06",
      },
    ],
    status: "reviewed",
  },
  {
    id: "d-bmc",
    name: "Business Model Canvas",
    programmeId: "p-accelerator-c6",
    group: "programme",
    groupLabel: "BID Accelerator – Cohort 6",
    dueDate: "2026-07-13",
    status: "pending",
  },
  {
    id: "d-finmodel",
    name: "Financial Model (3yr)",
    programmeId: "p-accelerator-c6",
    group: "programme",
    groupLabel: "BID Accelerator – Cohort 6",
    dueDate: "2026-07-20",
    submittedAt: "2026-07-01",
    fileName: "PayBridge_financial_model_v1.xlsx",
    fileType: "xlsx",
    reviewFeedback:
      "Current feedback: add monthly cash-flow assumptions and separate revenue lines by customer segment before resubmitting.",
    feedbackHistory: [
      {
        id: "fb-finmodel-current",
        message:
          "Please add monthly cash-flow assumptions and separate revenue lines by customer segment. Once updated, resubmit this file for another BID review.",
        reviewer: "Ama Darko",
        createdAt: "2026-07-03",
      },
      {
        id: "fb-finmodel-earlier",
        message:
          "The model structure is clear. Before approval, BID needs more detail on the revenue assumptions behind each customer segment.",
        reviewer: "Kofi Mensah",
        createdAt: "2026-07-01",
        readAt: "2026-07-02",
      },
    ],
    reviewer: "Ama Darko",
    status: "changes-requested",
  },
  {
    id: "d-readiness-deck",
    name: "Investor Pitch Deck",
    programmeId: "p-readiness-fintech",
    group: "programme",
    groupLabel: "Investment Readiness",
    submittedAt: "2025-03-20",
    fileName: "PayBridge pitch v4.pdf",
    fileType: "pdf",
    status: "reviewed",
  },
  {
    id: "d-oneway",
    name: "One-pager business summary",
    group: "general",
    groupLabel: "General deliverables",
    submittedAt: "2025-02-15",
    fileName: "PayBridge one-pager.pdf",
    fileType: "pdf",
    status: "reviewed",
  },
];

export const deliverablesForGroup = (groupId: string) => {
  const group = deliverableGroups.find((g) => g.id === groupId);
  if (!group) return [];
  // The mockup's "General" group is keyed off group === 'general'; the
  // programme-specific groups key off programmeId.
  if (group.id === "g-general") {
    return deliverables.filter((d) => d.group === "general");
  }
  return deliverables.filter((d) => d.programmeId === group.programmeId);
};

/**
 * Seed bookable/support sessions. Deliverable deadlines live on
 * deliverables and are merged into the schedule UI separately.
 */
export const sessions: Session[] = [
  {
    id: "s-mentor",
    type: "mentor-checkin",
    title: "Mentor check-in – Kofi Mensah",
    trainerId: "t-kofi",
    date: "2026-07-08",
    startTime: "10:00",
    endTime: "10:45",
    location: "virtual",
    meetingProvider: "google-meet",
    meetingUrl: "https://meet.google.com/bid-kofi-paybridge",
    status: "confirmed",
    accent: "bid",
  },
  {
    id: "s-office",
    type: "office-hours",
    title: "BID Office Hours (group)",
    date: "2026-07-10",
    startTime: "14:00",
    endTime: "15:30",
    location: "virtual",
    meetingProvider: "google-meet",
    meetingUrl: "https://meet.google.com/bid-office-hours",
    status: "confirmed",
    accent: "info",
  },
  {
    id: "s-investor-prep",
    type: "investor-prep",
    title: "Investor prep session",
    date: "2026-07-15",
    startTime: "11:00",
    endTime: "12:00",
    location: "virtual",
    meetingProvider: "google-meet",
    meetingUrl: "https://meet.google.com/bid-investor-prep",
    status: "confirmed",
    accent: "success",
  },
];

/**
 * Seed entrepreneur tools — the Tools page renders these as cards.
 */
export const tools: Tool[] = [
  {
    id: "tool-bmc",
    name: "Business Model Canvas",
    description: "Build and iterate on your BMC directly in the browser.",
    type: "embed",
    toolArea: "Strategy",
    status: "published",
    visibility: "all-entrepreneurs",
    embedUrl: "https://example.com",
    updatedAt: "2026-07-02",
    iconKey: "canvas",
  },
  {
    id: "tool-finmodel",
    name: "Financial Model Template",
    description: "Downloadable 3-year financial model resource (Excel/PDF).",
    type: "pdf",
    toolArea: "Finance",
    status: "published",
    visibility: "programmes",
    programmeIds: ["p-accelerator-c6", "p-readiness-fintech"],
    fileName: "Financial model resource.pdf",
    fileUrl:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    updatedAt: "2026-07-01",
    iconKey: "document",
  },
  {
    id: "tool-pitch-timer",
    name: "Pitch Timer",
    description: "Practice your investor pitch with structured timing cues.",
    type: "embed",
    toolArea: "Fundraising",
    status: "published",
    visibility: "all-entrepreneurs",
    embedUrl: "https://example.com",
    updatedAt: "2026-06-28",
    iconKey: "timer",
  },
  {
    id: "tool-pitch-scorer",
    name: "Pitch Deck Scorer Checklist",
    description:
      "Self-assessment checklist against BID's investor-readiness criteria.",
    type: "pdf",
    toolArea: "Fundraising",
    status: "published",
    visibility: "programmes",
    programmeIds: ["p-readiness-fintech"],
    fileName: "Pitch deck scorer checklist.pdf",
    fileUrl:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    updatedAt: "2026-06-26",
    iconKey: "star",
  },
  {
    id: "tool-market-sizing",
    name: "Market Sizing Calculator",
    description: "Estimate TAM, SAM and SOM with guided inputs.",
    type: "embed",
    toolArea: "Market research",
    status: "draft",
    visibility: "entrepreneurs",
    entrepreneurIds: ["e-paybridge"],
    embedUrl: "https://example.com",
    updatedAt: "2026-07-05",
    iconKey: "plus",
  },
  {
    id: "tool-quarterly",
    name: "Quarterly Goal Tracker",
    description: "Printable resource for setting and tracking quarterly goals.",
    type: "pdf",
    toolArea: "Impact reporting",
    status: "archived",
    visibility: "all-entrepreneurs",
    fileName: "Quarterly goal tracker.pdf",
    fileUrl:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    updatedAt: "2026-05-15",
    iconKey: "calendar",
  },
];

export const toolById = (id: string) => tools.find((t) => t.id === id);

/**
 * Seed recent activity for the entrepreneur dashboard.
 */
export const recentActivity: ActivityEntry[] = [
  {
    id: "act-1",
    text: "Completed ",
    emphasis: "Investor Pitch Fundamentals",
    timestamp: "2h ago",
    accent: "bid",
  },
  {
    id: "act-2",
    text: "BID Team left feedback on ",
    emphasis: "Q1 Report.pdf",
    timestamp: "Yesterday",
    accent: "info",
  },
  {
    id: "act-3",
    text: "",
    emphasis: "Business Model Canvas",
    timestamp: "Apr 11",
    accent: "warning",
    // The mockup renders this as "Business Model Canvas due in 3 days".
  },
  {
    id: "act-4",
    text: "Session booked: ",
    emphasis: "Office Hours",
    timestamp: "Apr 8",
    accent: "neutral",
  },
];

/**
 * Admin dashboard pending actions list.
 */
export const pendingActions: PendingAction[] = [
  {
    id: "pa-1",
    label: "Deliverables awaiting review",
    count: 12,
    tone: "amber",
  },
  { id: "pa-2", label: "Self-registered, unassigned", count: 3, tone: "red" },
  { id: "pa-3", label: "Tool requests pending", count: 2, tone: "blue" },
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
  {
    programName: "BID Accelerator",
    value: 38,
    label: "38",
    accent: "bid",
    percent: 60,
  },
  {
    programName: "Investment Readiness",
    value: 19,
    label: "19",
    accent: "info",
    percent: 30,
  },
  {
    programName: "Women Econ. Empowerment",
    value: 5,
    label: "5",
    accent: "success",
    percent: 10,
  },
];

export const fundsByProgram: ProgramBreakdownRow[] = [
  {
    programName: "BID Accelerator",
    value: 150000,
    label: "$150k",
    accent: "bid",
    percent: 45,
  },
  {
    programName: "Investment Readiness",
    value: 190000,
    label: "$190k",
    accent: "info",
    percent: 55,
  },
  {
    programName: "Women Econ. Empowerment",
    value: 0,
    label: "$0",
    accent: "success",
    percent: 0,
  },
];

/** Per-programme reporting snapshots used when a specific programme is selected. */
export const reportingByProgramme: Record<
  string,
  {
    metrics: ReportingMetrics;
    jobsByProgram: ProgramBreakdownRow[];
    fundsByProgram: ProgramBreakdownRow[];
  }
> = {
  "p-accelerator-c6": {
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
      {
        programName: "BID Accelerator – Cohort 6",
        value: 38,
        label: "38",
        accent: "bid",
        percent: 100,
      },
    ],
    fundsByProgram: [
      {
        programName: "BID Accelerator – Cohort 6",
        value: 150000,
        label: "$150k",
        accent: "bid",
        percent: 100,
      },
    ],
  },
  "p-readiness-fintech": {
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
      {
        programName: "Investment Readiness for Fintech",
        value: 19,
        label: "19",
        accent: "info",
        percent: 100,
      },
    ],
    fundsByProgram: [
      {
        programName: "Investment Readiness for Fintech",
        value: 190000,
        label: "$190k",
        accent: "info",
        percent: 100,
      },
    ],
  },
  "p-wee": {
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
      {
        programName: "Women Economic Empowerment",
        value: 5,
        label: "5",
        accent: "success",
        percent: 100,
      },
    ],
    fundsByProgram: [
      {
        programName: "Women Economic Empowerment",
        value: 0,
        label: "$0",
        accent: "success",
        percent: 0,
      },
    ],
  },
};
