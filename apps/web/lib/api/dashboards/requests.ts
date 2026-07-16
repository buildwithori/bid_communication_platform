import { apiRequest } from "../client";
import type {
  AdminDashboard,
  AdminRecentEntrepreneurQuery,
  DashboardRecentEntrepreneurPage,
  EntrepreneurDashboard,
  TrainerDashboard,
} from "./types";

function queryString(query: AdminRecentEntrepreneurQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function getAdminDashboardRequest() {
  return apiRequest<AdminDashboard>("/dashboards/admin");
}

export function listAdminRecentEntrepreneursRequest(
  query: AdminRecentEntrepreneurQuery,
) {
  return apiRequest<DashboardRecentEntrepreneurPage>(
    `/dashboards/admin/recent-entrepreneurs${queryString(query)}`,
  );
}

export function getTrainerDashboardRequest() {
  return apiRequest<TrainerDashboard>("/dashboards/trainer");
}

export function getEntrepreneurDashboardRequest() {
  return apiRequest<EntrepreneurDashboard>("/dashboards/entrepreneur");
}
