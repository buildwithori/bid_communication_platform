import type { OverdueUpdatesQuery, ReportingQuery } from "./types";

export const reportingKeys = {
  all: ["reporting"] as const,
  overview: (query: ReportingQuery) =>
    [...reportingKeys.all, "overview", query] as const,
  overdue: (query: OverdueUpdatesQuery) =>
    [...reportingKeys.all, "overdue", query] as const,
  export: (id: string) => [...reportingKeys.all, "export", id] as const,
};
