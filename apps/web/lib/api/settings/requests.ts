import { apiRequest } from "../client";
import type {
  BusinessStagePayload,
  BusinessStageRecord,
  BusinessStageUpdatePayload,
  CompanyConfig,
  CompanyConfigPatch,
  CompanySettingsResponse,
  LookupPage,
  LookupPayload,
  LookupQuery,
  LookupRecord,
  LookupUpdatePayload,
  ProgrammeGoalTypePayload,
  ProgrammeGoalTypeRecord,
  ProgrammeGoalTypeUpdatePayload,
} from "./types";

function toClientSessionProvider(provider: string) {
  return provider === "google_meet" ? "google-meet" : provider;
}

function toApiSessionProvider(provider: string | undefined) {
  return provider === "google-meet" ? "google_meet" : provider;
}

function mapCompanySettings(settings: CompanySettingsResponse): CompanyConfig {
  const currency = settings.defaultCurrency.trim().toUpperCase() || "USD";
  const timezone = settings.defaultTimezone.trim() || "UTC";

  return {
    reporting: {
      periodicUpdateOverdueAfterDays: settings.periodicUpdateOverdueAfterDays,
    },
    deliverables: {
      moduleCompletionDeliverableDueDays:
        settings.moduleCompletionDeliverableDueDays,
    },
    defaults: {
      currency,
      timezone,
      sessionProvider: toClientSessionProvider(settings.defaultSessionProvider),
    },
    sessions: {
      workingDays: settings.sessionWorkingDays,
      workdayStartMinutes: settings.sessionWorkdayStartMinutes,
      workdayEndMinutes: settings.sessionWorkdayEndMinutes,
      slotIntervalMinutes: settings.sessionSlotIntervalMinutes,
      defaultDurationMinutes: settings.defaultSessionDurationMinutes,
    },
    notifications: {
      inAppNotifications: settings.inAppNotificationsEnabledByDefault,
      emailNotifications: settings.emailNotificationsEnabledByDefault,
      reminderNotifications: settings.reminderNotificationsEnabledByDefault,
      weeklyDigest: settings.weeklyDigestEnabledByDefault,
    },
  };
}

function toCompanySettingsPatch(
  patch: CompanyConfigPatch,
): Partial<CompanySettingsResponse> {
  return {
    periodicUpdateOverdueAfterDays:
      patch.reporting?.periodicUpdateOverdueAfterDays,
    moduleCompletionDeliverableDueDays:
      patch.deliverables?.moduleCompletionDeliverableDueDays,
    defaultCurrency: patch.defaults?.currency,
    defaultTimezone: patch.defaults?.timezone,
    defaultSessionProvider: toApiSessionProvider(
      patch.defaults?.sessionProvider,
    ),
    sessionWorkingDays: patch.sessions?.workingDays,
    sessionWorkdayStartMinutes: patch.sessions?.workdayStartMinutes,
    sessionWorkdayEndMinutes: patch.sessions?.workdayEndMinutes,
    sessionSlotIntervalMinutes: patch.sessions?.slotIntervalMinutes,
    defaultSessionDurationMinutes: patch.sessions?.defaultDurationMinutes,
    inAppNotificationsEnabledByDefault: patch.notifications?.inAppNotifications,
    emailNotificationsEnabledByDefault: patch.notifications?.emailNotifications,
    reminderNotificationsEnabledByDefault:
      patch.notifications?.reminderNotifications,
    weeklyDigestEnabledByDefault: patch.notifications?.weeklyDigest,
  };
}

function toQueryString(query?: LookupQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (typeof query?.active === "boolean")
    params.set("active", String(query.active));
  if (query?.take) params.set("take", String(query.take));
  if (query?.cursor) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function getCompanySettingsRequest() {
  return mapCompanySettings(
    await apiRequest<CompanySettingsResponse>("/company-settings"),
  );
}

export async function updateCompanySettingsRequest(patch: CompanyConfigPatch) {
  const response = await apiRequest<CompanySettingsResponse>(
    "/company-settings",
    {
      method: "PATCH",
      body: JSON.stringify(toCompanySettingsPatch(patch)),
    },
  );
  return mapCompanySettings(response);
}

export function listSectorsRequest(query?: LookupQuery) {
  return apiRequest<LookupPage<LookupRecord>>(
    `/lookups/sectors${toQueryString(query)}`,
  );
}

export function createSectorRequest(payload: LookupPayload) {
  return apiRequest<LookupRecord>("/settings/sectors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSectorRequest({
  id,
  payload,
}: {
  id: string;
  payload: LookupUpdatePayload;
}) {
  return apiRequest<LookupRecord>(`/settings/sectors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listBusinessStagesRequest(query?: LookupQuery) {
  return apiRequest<LookupPage<BusinessStageRecord>>(
    `/lookups/business-stages${toQueryString(query)}`,
  );
}

export function createBusinessStageRequest(payload: BusinessStagePayload) {
  return apiRequest<BusinessStageRecord>("/settings/business-stages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBusinessStageRequest({
  id,
  payload,
}: {
  id: string;
  payload: BusinessStageUpdatePayload;
}) {
  return apiRequest<BusinessStageRecord>(`/settings/business-stages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listProgrammeGoalTypesRequest(query?: LookupQuery) {
  return apiRequest<LookupPage<ProgrammeGoalTypeRecord>>(
    `/lookups/programme-goal-types${toQueryString(query)}`,
  );
}

export function createProgrammeGoalTypeRequest(
  payload: ProgrammeGoalTypePayload,
) {
  return apiRequest<ProgrammeGoalTypeRecord>("/settings/programme-goal-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProgrammeGoalTypeRequest({
  id,
  payload,
}: {
  id: string;
  payload: ProgrammeGoalTypeUpdatePayload;
}) {
  return apiRequest<ProgrammeGoalTypeRecord>(
    `/settings/programme-goal-types/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function listToolAreasRequest(query?: LookupQuery) {
  return apiRequest<LookupPage<LookupRecord>>(
    `/lookups/tool-areas${toQueryString(query)}`,
  );
}

export function createToolAreaRequest(payload: LookupPayload) {
  return apiRequest<LookupRecord>("/settings/tool-areas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateToolAreaRequest({
  id,
  payload,
}: {
  id: string;
  payload: LookupUpdatePayload;
}) {
  return apiRequest<LookupRecord>(`/settings/tool-areas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
