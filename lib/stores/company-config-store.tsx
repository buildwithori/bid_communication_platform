'use client';

import * as React from 'react';
import { companyConfig as seedCompanyConfig } from '@/lib/mock-data/company-config';

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
  notifications: {
    inAppNotifications: boolean;
    emailNotifications: boolean;
    reminderNotifications: boolean;
    weeklyDigest: boolean;
  };
}

interface CompanyConfigStore {
  companyConfig: CompanyConfig;
  updateReportingConfig: (patch: Partial<CompanyConfig['reporting']>) => void;
  updateDeliverableConfig: (patch: Partial<CompanyConfig['deliverables']>) => void;
  updateDefaultConfig: (patch: Partial<CompanyConfig['defaults']>) => void;
  updateNotificationConfig: (patch: Partial<CompanyConfig['notifications']>) => void;
}

const CompanyConfigContext = React.createContext<CompanyConfigStore | null>(null);

export function CompanyConfigProvider({ children }: { children: React.ReactNode }) {
  const [companyConfig, setCompanyConfig] = React.useState<CompanyConfig>(seedCompanyConfig);

  const updateReportingConfig: CompanyConfigStore['updateReportingConfig'] = React.useCallback((patch) => {
    setCompanyConfig((current) => ({
      ...current,
      reporting: {
        ...current.reporting,
        ...patch,
      },
    }));
  }, []);

  const updateDeliverableConfig: CompanyConfigStore['updateDeliverableConfig'] = React.useCallback((patch) => {
    setCompanyConfig((current) => ({
      ...current,
      deliverables: {
        ...current.deliverables,
        ...patch,
      },
    }));
  }, []);

  const updateDefaultConfig: CompanyConfigStore['updateDefaultConfig'] = React.useCallback((patch) => {
    setCompanyConfig((current) => ({
      ...current,
      defaults: {
        ...current.defaults,
        ...patch,
      },
    }));
  }, []);

  const updateNotificationConfig: CompanyConfigStore['updateNotificationConfig'] = React.useCallback((patch) => {
    setCompanyConfig((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        ...patch,
      },
    }));
  }, []);

  const value = React.useMemo<CompanyConfigStore>(
    () => ({
      companyConfig,
      updateReportingConfig,
      updateDeliverableConfig,
      updateDefaultConfig,
      updateNotificationConfig,
    }),
    [
      companyConfig,
      updateReportingConfig,
      updateDeliverableConfig,
      updateDefaultConfig,
      updateNotificationConfig,
    ],
  );

  return (
    <CompanyConfigContext.Provider value={value}>
      {children}
    </CompanyConfigContext.Provider>
  );
}

export function useCompanyConfigStore() {
  const context = React.useContext(CompanyConfigContext);
  if (!context) {
    throw new Error('useCompanyConfigStore must be used inside a CompanyConfigProvider');
  }
  return context;
}
