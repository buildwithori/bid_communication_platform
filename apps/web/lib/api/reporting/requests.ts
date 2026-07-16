import { apiRequest } from "../client";
import type {
  CreateReportExportPayload,
  OverdueUpdatePage,
  OverdueUpdatesQuery,
  ReportExport,
  ReportExportDownload,
  ReportingOverview,
  ReportingQuery,
  SendReportingReminderPayload,
} from "./types";

function queryString(query: ReportingQuery | OverdueUpdatesQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const string = params.toString();
  return string ? `?${string}` : "";
}

export const getReportingOverviewRequest = (query: ReportingQuery) =>
  apiRequest<ReportingOverview>(`/reporting/overview${queryString(query)}`);

export const getOverdueUpdatesRequest = (query: OverdueUpdatesQuery) =>
  apiRequest<OverdueUpdatePage>(
    `/reporting/overdue-updates${queryString(query)}`,
  );

export const createReportExportRequest = (payload: CreateReportExportPayload) =>
  apiRequest<ReportExport>("/reporting/exports", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getReportExportRequest = (id: string) =>
  apiRequest<ReportExport>(`/reporting/exports/${id}`);

export const getReportExportDownloadRequest = (id: string) =>
  apiRequest<ReportExportDownload>(`/reporting/exports/${id}/download`);

export const sendReportingReminderRequest = ({
  entrepreneurUserId,
  ...payload
}: SendReportingReminderPayload) =>
  apiRequest(`/reporting/overdue-updates/${entrepreneurUserId}/reminder`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
