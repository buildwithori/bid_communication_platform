import type { AdminRecentEntrepreneurQuery } from "./types";

export const dashboardKeys = {
  all: ["dashboards"] as const,
  admin: () => [...dashboardKeys.all, "admin"] as const,
  trainer: () => [...dashboardKeys.all, "trainer"] as const,
  entrepreneur: () => [...dashboardKeys.all, "entrepreneur"] as const,
  recentEntrepreneurs: (query: AdminRecentEntrepreneurQuery) =>
    [...dashboardKeys.admin(), "recent-entrepreneurs", query] as const,
};
