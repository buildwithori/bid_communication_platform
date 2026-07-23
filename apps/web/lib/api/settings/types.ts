export interface CompanyConfig {
  reporting: {
    periodicUpdateOverdueAfterDays: number;
  };
  deliverables: {
    moduleCompletionDeliverableDueDays: number | null;
  };
  defaults: {
    currency: string;
    timezone: string;
    sessionProvider: string;
  };
  sessions: {
    workingDays: number[];
    workdayStartMinutes: number;
    workdayEndMinutes: number;
    slotIntervalMinutes: number;
  };
  notifications: {
    inAppNotifications: boolean;
    emailNotifications: boolean;
    reminderNotifications: boolean;
    weeklyDigest: boolean;
  };
}

export type CompanyConfigPatch = {
  reporting?: Partial<CompanyConfig["reporting"]>;
  deliverables?: Partial<CompanyConfig["deliverables"]>;
  defaults?: Partial<CompanyConfig["defaults"]>;
  sessions?: Partial<CompanyConfig["sessions"]>;
  notifications?: Partial<CompanyConfig["notifications"]>;
};

export type CompanySettingsResponse = {
  periodicUpdateOverdueAfterDays: number;
  moduleCompletionDeliverableDueDays: number | null;
  defaultCurrency: string;
  defaultTimezone: string;
  defaultSessionProvider: string;
  sessionWorkingDays: number[];
  sessionWorkdayStartMinutes: number;
  sessionWorkdayEndMinutes: number;
  sessionSlotIntervalMinutes: number;
  inAppNotificationsEnabledByDefault: boolean;
  emailNotificationsEnabledByDefault: boolean;
  reminderNotificationsEnabledByDefault: boolean;
  weeklyDigestEnabledByDefault: boolean;
};

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

export type SessionTypeRecord = LookupRecord & {
  durationMinutes: number;
};

export type LookupPage<TRecord> = {
  items: TRecord[];
  nextCursor: string | null;
  totalItems: number;
};

export type LookupQuery = {
  search?: string;
  active?: boolean;
  take?: number;
  cursor?: string;
};

export type LookupPayload = {
  name: string;
  key?: string;
  active?: boolean;
};

export type BusinessStagePayload = LookupPayload & {
  definition: string;
};

export type ProgrammeGoalTypePayload = LookupPayload & {
  description?: string;
  requiresTargetAmount?: boolean;
};

export type SessionTypePayload = LookupPayload & {
  durationMinutes: number;
};

export type LookupUpdatePayload = Partial<LookupPayload>;
export type BusinessStageUpdatePayload = Partial<BusinessStagePayload>;
export type ProgrammeGoalTypeUpdatePayload = Partial<ProgrammeGoalTypePayload>;
export type SessionTypeUpdatePayload = Partial<SessionTypePayload>;

export type UpdateLookupVariables<TPayload> = {
  id: string;
  payload: TPayload;
};
