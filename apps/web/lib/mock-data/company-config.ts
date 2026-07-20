import { PLATFORM_DEFAULT_TIMEZONE } from "@/lib/timezones";

export const companyConfig = {
  reporting: {
    periodicUpdateOverdueAfterDays: 30,
  },
  deliverables: {
    moduleCompletionDeliverableDueDays: 7,
  },
  defaults: {
    currency: "USD",
    timezone: PLATFORM_DEFAULT_TIMEZONE,
    sessionProvider: "google-meet",
  },
  sessions: {
    workingDays: [1, 2, 3, 4, 5],
    workdayStartMinutes: 540,
    workdayEndMinutes: 1020,
    slotIntervalMinutes: 30,
    defaultDurationMinutes: 60,
  },
  notifications: {
    inAppNotifications: true,
    emailNotifications: true,
    reminderNotifications: true,
    weeklyDigest: false,
  },
};
