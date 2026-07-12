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
      sessionProvider: settings.defaultSessionProvider,
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
    defaultSessionProvider: patch.defaults?.sessionProvider,
    inAppNotificationsEnabledByDefault: patch.notifications?.inAppNotifications,
    emailNotificationsEnabledByDefault: patch.notifications?.emailNotifications,
    reminderNotificationsEnabledByDefault: patch.notifications?.reminderNotifications,
    weeklyDigestEnabledByDefault: patch.notifications?.weeklyDigest,
  };
}
