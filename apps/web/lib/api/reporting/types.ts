export type ReportingQuery = {
  programmeId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ReportPriority = "newly_overdue" | "late" | "critical";

export type ReportingBreakdown = {
  programmeId: string | null;
  programmeName: string;
  value: number;
  percent: number;
};

export type ReportingOverview = {
  period: { from: string; to: string };
  scope: { programmeId: string | null; programmeName: string };
  sources: { jobs: string; funds: string; overdue: string };
  settings: {
    currency: string;
    periodicUpdateOverdueAfterDays: number;
  };
  metrics: {
    jobsCreated: number;
    jobsWomen: number;
    jobsMen: number;
    fundsMobilisedCents: number;
    entrepreneursWithFunds: number;
    updateSubmissionRate: number;
    submittedEntrepreneurs: number;
    totalEntrepreneurs: number;
    trainingCompletionRate: number;
    overdueEntrepreneurs: number;
  };
  jobsByProgramme: ReportingBreakdown[];
  fundsByProgramme: ReportingBreakdown[];
};

export type OverdueUpdate = {
  id: string;
  entrepreneurUserId: string;
  businessId: string;
  businessName: string;
  representativeName: string;
  email: string;
  programmes: Array<{ id: string; name: string }>;
  lastReport: {
    submittedAt: string;
    periodStart: string;
    periodEnd: string;
  } | null;
  joinedAt: string;
  daysWithoutReport: number;
  daysOverdue: number;
  priority: ReportPriority;
};

export type OverdueUpdatesQuery = {
  search?: string;
  programmeId?: string;
  priority?: ReportPriority;
  take?: number;
  cursor?: string;
};

export type OverdueUpdatePage = {
  items: OverdueUpdate[];
  nextCursor: string | null;
  totalItems: number;
  overdueAfterDays: number;
};

export type ReportExportFormat = "csv" | "xlsx";
export type ReportExportStatus = "queued" | "processing" | "ready" | "failed";

export type ReportExport = {
  id: string;
  format: ReportExportFormat;
  status: ReportExportStatus;
  programmeId: string | null;
  programmeName: string | null;
  dateFrom: string;
  dateTo: string;
  fileAssetId: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
};

export type CreateReportExportPayload = ReportingQuery & {
  format: ReportExportFormat;
};

export type ReportExportDownload = {
  file: {
    id: string;
    originalFilename: string;
    mimeType: string;
  };
  download: { url: string; expiresAt: string };
};

export type SendReportingReminderPayload = {
  entrepreneurUserId: string;
  subject: string;
  message: string;
  channel: "email" | "in_app";
};
