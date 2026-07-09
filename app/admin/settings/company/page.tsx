'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { FormField, FormInput } from '@/components/shared/FormField';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { useCompanyConfigStore } from '@/lib/stores/company-config-store';

export default function AdminCompanySettingsPage() {
  const { companyConfig, updateReportingConfig } = useCompanyConfigStore();
  const [overdueAfterDays, setOverdueAfterDays] = React.useState(
    String(companyConfig.reporting.periodicUpdateOverdueAfterDays),
  );
  const numericValue = Number(overdueAfterDays);
  const hasError =
    !Number.isInteger(numericValue) || numericValue < 1 || numericValue > 365;

  React.useEffect(() => {
    setOverdueAfterDays(String(companyConfig.reporting.periodicUpdateOverdueAfterDays));
  }, [companyConfig.reporting.periodicUpdateOverdueAfterDays]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hasError) return;
    updateReportingConfig({ periodicUpdateOverdueAfterDays: numericValue });
    toast.success('Company settings updated');
  };

  return (
    <>
      <PageHeader
        title="Company settings"
        description="Configure platform-wide rules used across admin, trainer, and entrepreneur workflows."
      />

      <MetricGrid>
        <StatCard
          label="Periodic report overdue after"
          value={`${companyConfig.reporting.periodicUpdateOverdueAfterDays} days`}
          subline="Used by reporting and follow-up queues"
          dotColor="bid"
        />
      </MetricGrid>

      <Card className="mt-4">
        <CardHeader
          title="Reporting rules"
          description="Set when an active entrepreneur should appear as overdue for periodic reporting."
        />
        <Notice>
          This rule is company-wide. If an entrepreneur has never submitted a periodic report,
          the count starts from their joined date. Otherwise, it starts from the latest
          periodic report date.
        </Notice>
        <form onSubmit={onSubmit} className="mt-4 max-w-[520px]">
          <FormField
            label="Mark periodic report as overdue after"
            error={hasError ? 'Enter a whole number between 1 and 365.' : undefined}
          >
            <div className="grid gap-2 sm:grid-cols-[180px_auto] sm:items-center">
              <FormInput
                type="number"
                min={1}
                max={365}
                step={1}
                value={overdueAfterDays}
                onChange={(event) => setOverdueAfterDays(event.target.value)}
              />
              <span className="text-sm text-ink-muted">days without a periodic report</span>
            </div>
          </FormField>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={hasError}>
              Save settings
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOverdueAfterDays('30');
                updateReportingConfig({ periodicUpdateOverdueAfterDays: 30 });
                toast.success('Reporting rule reset to 30 days');
              }}
            >
              Reset to 30 days
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
