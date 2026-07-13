'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCompanySettings, updateCompanySettings } from '@/lib/api/settings';
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
  replaceCompanyConfig: (config: CompanyConfig) => void;
  updateReportingConfig: (patch: Partial<CompanyConfig['reporting']>) => void;
  updateDeliverableConfig: (patch: Partial<CompanyConfig['deliverables']>) => void;
  updateDefaultConfig: (patch: Partial<CompanyConfig['defaults']>) => void;
  updateNotificationConfig: (patch: Partial<CompanyConfig['notifications']>) => void;
}

const CompanyConfigContext = React.createContext<CompanyConfigStore | null>(null);

export function CompanyConfigProvider({ children }: { children: React.ReactNode }) {
  const [companyConfig, setCompanyConfig] = React.useState<CompanyConfig>(seedCompanyConfig);
  const pathname = usePathname();
  const shouldLoadSettings = pathname !== '/' && !pathname.startsWith('/auth');
  const settingsQuery = useQuery({
    queryKey: ['company-settings'],
    queryFn: getCompanySettings,
    enabled: shouldLoadSettings,
  });
  const updateSettingsMutation = useMutation({
    mutationFn: updateCompanySettings,
    onSuccess: setCompanyConfig,
  });

  React.useEffect(() => {
    if (settingsQuery.data) {
      setCompanyConfig(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const replaceCompanyConfig: CompanyConfigStore['replaceCompanyConfig'] = React.useCallback((config) => {
    setCompanyConfig(config);
  }, []);

  const updateReportingConfig: CompanyConfigStore['updateReportingConfig'] = React.useCallback((patch) => {
    setCompanyConfig((current) => ({
      ...current,
      reporting: {
        ...current.reporting,
        ...patch,
      },
    }));
    updateSettingsMutation.mutate({ reporting: patch });
  }, [updateSettingsMutation]);

  const updateDeliverableConfig: CompanyConfigStore['updateDeliverableConfig'] = React.useCallback((patch) => {
    setCompanyConfig((current) => ({
      ...current,
      deliverables: {
        ...current.deliverables,
        ...patch,
      },
    }));
    updateSettingsMutation.mutate({ deliverables: patch });
  }, [updateSettingsMutation]);

  const updateDefaultConfig: CompanyConfigStore['updateDefaultConfig'] = React.useCallback((patch) => {
    setCompanyConfig((current) => ({
      ...current,
      defaults: {
        ...current.defaults,
        ...patch,
      },
    }));
    updateSettingsMutation.mutate({ defaults: patch });
  }, [updateSettingsMutation]);

  const updateNotificationConfig: CompanyConfigStore['updateNotificationConfig'] = React.useCallback((patch) => {
    setCompanyConfig((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        ...patch,
      },
    }));
    updateSettingsMutation.mutate({ notifications: patch });
  }, [updateSettingsMutation]);

  const value = React.useMemo<CompanyConfigStore>(
    () => ({
      companyConfig,
      replaceCompanyConfig,
      updateReportingConfig,
      updateDeliverableConfig,
      updateDefaultConfig,
      updateNotificationConfig,
    }),
    [
      companyConfig,
      replaceCompanyConfig,
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
