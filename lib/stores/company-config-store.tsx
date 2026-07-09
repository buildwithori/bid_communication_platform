'use client';

import * as React from 'react';
import { companyConfig as seedCompanyConfig } from '@/lib/mock-data/company-config';

export interface CompanyConfig {
  reporting: {
    periodicUpdateOverdueAfterDays: number;
  };
}

interface CompanyConfigStore {
  companyConfig: CompanyConfig;
  updateReportingConfig: (patch: Partial<CompanyConfig['reporting']>) => void;
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

  const value = React.useMemo<CompanyConfigStore>(
    () => ({
      companyConfig,
      updateReportingConfig,
    }),
    [companyConfig, updateReportingConfig],
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
