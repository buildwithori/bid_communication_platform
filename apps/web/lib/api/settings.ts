import { type CompanyConfig } from '@/lib/stores/company-config-store';
import { apiRequest } from './client';

export type CompanyConfigPatch = {
  reporting?: Partial<CompanyConfig['reporting']>;
  deliverables?: Partial<CompanyConfig['deliverables']>;
  defaults?: Partial<CompanyConfig['defaults']>;
  notifications?: Partial<CompanyConfig['notifications']>;
};

type CompanySettingsResponse = {
  periodicUpdateOverdueAfterDays: number;
  moduleCompletionDeliverableDueDays: number | null;
  defaultCurrency: string;
  defaultTimezone: string;
  defaultSessionProvider: string;
  inAppNotificationsEnabledByDefault: boolean;
  emailNotificationsEnabledByDefault: boolean;
  reminderNotificationsEnabledByDefault: boolean;
  weeklyDigestEnabledByDefault: boolean;
};

type CompanySettingsPatch = Partial<CompanySettingsResponse>;

function toClientSessionProvider(provider: string) {
  return provider === 'google_meet' ? 'google-meet' : provider;
}

function toApiSessionProvider(provider: string | undefined) {
  return provider === 'google-meet' ? 'google_meet' : provider;
}

export async function getCompanySettings() {
  const response = await apiRequest<CompanySettingsResponse>('/company-settings');
  return mapCompanySettings(response);
}

export async function updateCompanySettings(patch: CompanyConfigPatch) {
  const response = await apiRequest<CompanySettingsResponse>('/company-settings', {
    method: 'PATCH',
    body: JSON.stringify(toCompanySettingsPatch(patch)),
  });

  return mapCompanySettings(response);
}

function mapCompanySettings(settings: CompanySettingsResponse): CompanyConfig {
  return {
    reporting: {
      periodicUpdateOverdueAfterDays: settings.periodicUpdateOverdueAfterDays,
    },
    deliverables: {
      moduleCompletionDeliverableDueDays: settings.moduleCompletionDeliverableDueDays,
    },
    defaults: {
      currency: settings.defaultCurrency,
      timezone: settings.defaultTimezone,
      sessionProvider: toClientSessionProvider(settings.defaultSessionProvider),
    },
    notifications: {
      inAppNotifications: settings.inAppNotificationsEnabledByDefault,
      emailNotifications: settings.emailNotificationsEnabledByDefault,
      reminderNotifications: settings.reminderNotificationsEnabledByDefault,
      weeklyDigest: settings.weeklyDigestEnabledByDefault,
    },
  };
}

function toCompanySettingsPatch(patch: CompanyConfigPatch): CompanySettingsPatch {
  return {
    periodicUpdateOverdueAfterDays: patch.reporting?.periodicUpdateOverdueAfterDays,
    moduleCompletionDeliverableDueDays: patch.deliverables?.moduleCompletionDeliverableDueDays,
    defaultCurrency: patch.defaults?.currency,
    defaultTimezone: patch.defaults?.timezone,
    defaultSessionProvider: toApiSessionProvider(patch.defaults?.sessionProvider),
    inAppNotificationsEnabledByDefault: patch.notifications?.inAppNotifications,
    emailNotificationsEnabledByDefault: patch.notifications?.emailNotifications,
    reminderNotificationsEnabledByDefault: patch.notifications?.reminderNotifications,
    weeklyDigestEnabledByDefault: patch.notifications?.weeklyDigest,
  };
}

export type LookupRecord = {
  id: string;
  name: string;
  key: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BusinessStageRecord = LookupRecord & {
  definition: string;
};

export type ProgrammeGoalTypeRecord = LookupRecord & {
  description: string | null;
  requiresTargetAmount: boolean;
};

export type LookupQuery = {
  search?: string;
  active?: boolean;
};

function toQueryString(query?: LookupQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (typeof query?.active === 'boolean') params.set('active', String(query.active));
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listSectors(query?: LookupQuery) {
  return apiRequest<LookupRecord[]>(`/lookups/sectors${toQueryString(query)}`);
}

export function createSector(payload: { name: string; key?: string; active?: boolean }) {
  return apiRequest<LookupRecord>('/settings/sectors', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSector(id: string, payload: { name?: string; key?: string; active?: boolean }) {
  return apiRequest<LookupRecord>(`/settings/sectors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listBusinessStages(query?: LookupQuery) {
  return apiRequest<BusinessStageRecord[]>(`/lookups/business-stages${toQueryString(query)}`);
}

export function createBusinessStage(payload: { name: string; key?: string; definition: string; active?: boolean }) {
  return apiRequest<BusinessStageRecord>('/settings/business-stages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBusinessStage(
  id: string,
  payload: { name?: string; key?: string; definition?: string; active?: boolean },
) {
  return apiRequest<BusinessStageRecord>(`/settings/business-stages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listProgrammeGoalTypes(query?: LookupQuery) {
  return apiRequest<ProgrammeGoalTypeRecord[]>(`/lookups/programme-goal-types${toQueryString(query)}`);
}

export function createProgrammeGoalType(payload: {
  name: string;
  key?: string;
  description?: string;
  requiresTargetAmount?: boolean;
  active?: boolean;
}) {
  return apiRequest<ProgrammeGoalTypeRecord>('/settings/programme-goal-types', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProgrammeGoalType(
  id: string,
  payload: {
    name?: string;
    key?: string;
    description?: string;
    requiresTargetAmount?: boolean;
    active?: boolean;
  },
) {
  return apiRequest<ProgrammeGoalTypeRecord>(`/settings/programme-goal-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listToolAreas(query?: LookupQuery) {
  return apiRequest<LookupRecord[]>(`/lookups/tool-areas${toQueryString(query)}`);
}

export function createToolArea(payload: { name: string; key?: string; active?: boolean }) {
  return apiRequest<LookupRecord>('/settings/tool-areas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateToolArea(id: string, payload: { name?: string; key?: string; active?: boolean }) {
  return apiRequest<LookupRecord>(`/settings/tool-areas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
