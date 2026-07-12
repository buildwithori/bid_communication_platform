'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Card, CardHeader } from '@/components/shared/Card';
import { BarChartRow } from '@/components/shared/BarChartRow';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { ProgrammeAccessList } from '@/components/shared/ProgrammeAccessList';
import { MessageModal } from '@/components/shared/MessageModal';
import { FormAutocomplete } from '@/components/shared/FormField';
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import {
  reportingMetrics,
  reportingByProgramme,
} from '@/lib/mock-data';
import { programs } from '@/lib/mock-data/programs';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import {
  getOverduePeriodicUpdates,
  type OverdueUpdateRow,
} from '@/lib/reporting/overdue-updates';
import { useCompanyConfigStore } from '@/lib/stores/company-config-store';
import { entrepreneurHasProgramme } from '@/lib/programme-access';
import type { FundingRound, PeriodicUpdate, ProgramBreakdownRow } from '@/types';
import { toast } from 'sonner';

const ALL = 'all';

function formatMoneyShort(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}m`;
  return `$${Math.round(value / 1000)}k`;
}

function toPercent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function buildJobsBreakdown(selectedProgramme: string): ProgramBreakdownRow[] {
  const formalPrograms =
    selectedProgramme === ALL
      ? programs
      : programs.filter((program) => program.id === selectedProgramme);
  const rows: ProgramBreakdownRow[] = formalPrograms.map((program) => {
    const value = entrepreneurs.reduce(
      (sum, entrepreneur) =>
        sum +
        (entrepreneur.periodicUpdates ?? [])
          .filter((update) => update.programmeId === program.id)
          .reduce((updateSum, update) => updateSum + update.jobsCreated, 0),
      0,
    );
    return {
      programName: program.name,
      value,
      label: String(value),
      accent: program.accent,
      percent: 0,
    };
  });

  if (selectedProgramme === ALL) {
    const unattributed = entrepreneurs.reduce(
      (sum, entrepreneur) =>
        sum +
        (entrepreneur.periodicUpdates ?? [])
          .filter((update) => !update.programmeId)
          .reduce((updateSum, update) => updateSum + update.jobsCreated, 0),
      0,
    );
    rows.push({
      programName: 'Company-wide / unattributed',
      value: unattributed,
      label: String(unattributed),
      accent: 'neutral',
      percent: 0,
    });
  }

  const max = Math.max(...rows.map((row) => row.value), 0);
  return rows.map((row) => ({ ...row, percent: toPercent(row.value, max) }));
}

function buildFundsBreakdown(selectedProgramme: string): ProgramBreakdownRow[] {
  const formalPrograms =
    selectedProgramme === ALL
      ? programs
      : programs.filter((program) => program.id === selectedProgramme);
  const rows: ProgramBreakdownRow[] = formalPrograms.map((program) => {
    const value = entrepreneurs.reduce(
      (sum, entrepreneur) =>
        sum +
        entrepreneur.fundingRounds
          .filter((round) => round.programmeId === program.id)
          .reduce((roundSum, round) => roundSum + round.amountUsd, 0),
      0,
    );
    return {
      programName: program.name,
      value,
      label: formatMoneyShort(value),
      accent: program.accent,
      percent: 0,
    };
  });

  if (selectedProgramme === ALL) {
    const unattributed = entrepreneurs.reduce(
      (sum, entrepreneur) =>
        sum +
        entrepreneur.fundingRounds
          .filter((round) => !round.programmeId)
          .reduce((roundSum, round) => roundSum + round.amountUsd, 0),
      0,
    );
    rows.push({
      programName: 'Company-wide / unattributed',
      value: unattributed,
      label: formatMoneyShort(unattributed),
      accent: 'neutral',
      percent: 0,
    });
  }

  const max = Math.max(...rows.map((row) => row.value), 0);
  return rows.map((row) => ({ ...row, percent: toPercent(row.value, max) }));
}

function updateMatchesProgramme(update: PeriodicUpdate, selectedProgramme: string) {
  return selectedProgramme === ALL || update.programmeId === selectedProgramme;
}

function roundMatchesProgramme(round: FundingRound, selectedProgramme: string) {
  return selectedProgramme === ALL || round.programmeId === selectedProgramme;
}

function getFollowUpPriority(daysOverdue: number) {
  if (daysOverdue > 90) return { label: 'Critical', tone: 'red' as const };
  if (daysOverdue > 30) return { label: 'Late', tone: 'amber' as const };
  return { label: 'Newly overdue', tone: 'blue' as const };
}

export default function AdminReportingPage() {
  const { companyConfig } = useCompanyConfigStore();
  const [selectedProgramme, setSelectedProgramme] = useState<string>(ALL);
  const [overdueQuery, setOverdueQuery] = useState('');
  const [overdueProgrammeFilter, setOverdueProgrammeFilter] = useState(ALL);
  const [overduePriorityFilter, setOverduePriorityFilter] = useState(ALL);
  const [overduePage, setOverduePage] = useState(1);
  const [overduePageSize, setOverduePageSize] = useState(10);
  const [messageTarget, setMessageTarget] = useState<OverdueUpdateRow | null>(null);

  const programmeData =
    selectedProgramme !== ALL ? reportingByProgramme[selectedProgramme] : null;

  const baseMetrics = programmeData?.metrics ?? reportingMetrics;
  const jobs = useMemo(() => buildJobsBreakdown(selectedProgramme), [selectedProgramme]);
  const funds = useMemo(() => buildFundsBreakdown(selectedProgramme), [selectedProgramme]);
  const impactMetrics = useMemo(() => {
    const matchingUpdates = entrepreneurs.flatMap((entrepreneur) =>
      (entrepreneur.periodicUpdates ?? []).filter((update) =>
        updateMatchesProgramme(update, selectedProgramme),
      ),
    );
    const matchingFunders = entrepreneurs.filter((entrepreneur) =>
      entrepreneur.fundingRounds.some((round) => roundMatchesProgramme(round, selectedProgramme)),
    );
    const matchingRounds = entrepreneurs.flatMap((entrepreneur) =>
      entrepreneur.fundingRounds.filter((round) => roundMatchesProgramme(round, selectedProgramme)),
    );

    return {
      ...baseMetrics,
      jobsCreated: matchingUpdates.reduce((sum, update) => sum + update.jobsCreated, 0),
      jobsWomen: matchingUpdates.reduce((sum, update) => sum + update.jobsWomen, 0),
      jobsMen: matchingUpdates.reduce((sum, update) => sum + update.jobsMen, 0),
      fundsMobilisedUsd: matchingRounds.reduce((sum, round) => sum + round.amountUsd, 0),
      entrepreneursWithFunds: matchingFunders.length,
    };
  }, [baseMetrics, selectedProgramme]);

  const overdueUpdates = useMemo(
    () =>
      getOverduePeriodicUpdates({
        entrepreneurs,
        programs,
        overdueAfterDays: companyConfig.reporting.periodicUpdateOverdueAfterDays,
      }),
    [companyConfig.reporting.periodicUpdateOverdueAfterDays],
  );

  const programmeOverdue =
    selectedProgramme === ALL
      ? overdueUpdates
      : overdueUpdates.filter((u) => entrepreneurHasProgramme(u.entrepreneur, selectedProgramme));
  const filteredOverdue = useMemo(() => {
    const needle = overdueQuery.trim().toLowerCase();
    return programmeOverdue.filter((u) => {
      const matchesSearch =
        !needle ||
        [
          u.entrepreneur.businessName,
          u.entrepreneur.representative,
          u.programmes.map((programme) => programme.name).join(' '),
          u.lastReportLabel,
          u.lastReportDateLabel,
          `${u.daysWithoutReport}`,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesProgramme =
        overdueProgrammeFilter === ALL ||
        (overdueProgrammeFilter === 'no-formal-programme' && u.programmes.length === 0) ||
        u.programmes.some((programme) => programme.id === overdueProgrammeFilter);
      const matchesPriority =
        overduePriorityFilter === ALL ||
        (overduePriorityFilter === 'newly-overdue' && u.daysOverdue <= 30) ||
        (overduePriorityFilter === 'late' && u.daysOverdue > 30 && u.daysOverdue <= 90) ||
        (overduePriorityFilter === 'critical' && u.daysOverdue > 90);

      return matchesSearch && matchesProgramme && matchesPriority;
    });
  }, [overduePriorityFilter, overdueProgrammeFilter, overdueQuery, programmeOverdue]);
  const overduePageRows = filteredOverdue.slice(
    (overduePage - 1) * overduePageSize,
    overduePage * overduePageSize,
  );

  const programmeOptions = useMemo(
    () => [
      { value: ALL, label: 'All programmes' },
      ...programs.map((program) => ({ value: program.id, label: program.name })),
    ],
    [],
  );

  const columns: Column<OverdueUpdateRow>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (row) => (
        <RowActions
          actions={[
            { label: 'Send reminder', onSelect: () => setMessageTarget(row) },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'ent',
      header: 'Entrepreneur',
      cell: (u) => (
        <div>
          <div className="font-medium text-ink">{u.entrepreneur.businessName}</div>
          <div className="text-sm text-ink-muted">{u.entrepreneur.representative}</div>
        </div>
      ),
    },
    {
      key: 'prog',
      header: 'Programme access',
      cell: (u) => (
        <ProgrammeAccessList
          programmes={u.programmes}
          maxVisible={2}
          modalTitle={`${u.entrepreneur.businessName} programme access`}
          className="min-w-[220px] max-w-[320px]"
        />
      ),
    },
    {
      key: 'lastPeriod',
      header: 'Last report',
      cell: (u) => (
        <div>
          <div className="font-medium text-ink">{u.lastReportLabel}</div>
          <div className="text-sm text-ink-muted">{u.lastReportDateLabel}</div>
        </div>
      ),
    },
    {
      key: 'followUp',
      header: 'Follow-up status',
      cell: (u) => (
        <div className="min-w-[170px]">
          <Badge tone={getFollowUpPriority(u.daysOverdue).tone}>
            {getFollowUpPriority(u.daysOverdue).label}
          </Badge>
          <div className="mt-2 text-sm text-ink-muted">
            {u.daysOverdue} days past follow-up window
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Reporting & analytics"
        description="Programme performance, jobs created and funds mobilised"
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-[260px]">
              <FormAutocomplete
                value={selectedProgramme}
                onValueChange={(value) => {
                  setSelectedProgramme(value);
                  setOverdueProgrammeFilter(ALL);
                  setOverduePriorityFilter(ALL);
                  setOverduePage(1);
                }}
                options={programmeOptions}
                placeholder="All programmes"
                searchPlaceholder="Search programmes..."
                emptyMessage="No programme found."
                className="bg-white"
                popoverClassName="sm:w-[320px]"
                listClassName="max-h-[260px]"
              />
            </div>

            <Button
              onClick={() => toast.success('Exporting report…')}
              className="flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF report
            </Button>
          </div>
        }
      />

      <Notice>
        <strong>How this data is collected:</strong> jobs come from periodic impact
        updates, while funds mobilised come from fundraising history. Each record can
        be attributed to a programme; records without attribution stay
        company-wide and are not forced into a programme chart.
      </Notice>

      <MetricGrid>
        <StatCard
          label="Jobs created (period)"
          value={impactMetrics.jobsCreated}
          subline={`${impactMetrics.jobsWomen} women · ${impactMetrics.jobsMen} men`}
          dotColor="bid"
        />
        <StatCard
          label="Funds mobilised (period)"
          value={formatMoneyShort(impactMetrics.fundsMobilisedUsd)}
          subline={`Across ${impactMetrics.entrepreneursWithFunds} entrepreneurs`}
          dotColor="info"
        />
        <StatCard
          label="Update submission rate"
          value={`${impactMetrics.updateSubmissionRate}%`}
          subline={`${impactMetrics.submittedUpdatesThisQuarter} of ${impactMetrics.totalEntrepreneurs} this quarter`}
          dotColor="warning"
        />
        <StatCard
          label="Training completion rate"
          value={`${impactMetrics.trainingCompletionRate}%`}
        />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Jobs created by programme" description="Only periodic updates attributed to a programme are counted under that programme" />
          {jobs.map((r) => (
            <BarChartRow
              key={r.programName}
              label={r.programName}
              value={r.label}
              percent={r.percent}
              accent={r.accent}
            />
          ))}
        </Card>
        <Card>
          <CardHeader title="Funds mobilised by programme" description="Only funding rounds attributed to a programme are counted under that programme" />
          {funds.map((r) => (
            <BarChartRow
              key={r.programName}
              label={r.programName}
              value={r.label}
              percent={r.percent}
              accent={r.accent}
            />
          ))}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Entrepreneurs with overdue updates"
          description={`Company setting: follow up after ${companyConfig.reporting.periodicUpdateOverdueAfterDays} days without a submitted periodic update. If no update exists, the count starts from the entrepreneur's join date.`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Search overdue updates</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Find entrepreneurs by business, representative, programme, or last report.
            </div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[320px_260px_220px]">
            <TableFilterInput
              icon
              placeholder="Search overdue updates..."
              value={overdueQuery}
              onChange={(event) => {
                setOverdueQuery(event.target.value);
                setOverduePage(1);
              }}
            />
            <TableFilterAutocomplete
              value={overdueProgrammeFilter}
              onValueChange={(value) => {
                setOverdueProgrammeFilter(value);
                setOverduePage(1);
              }}
              options={[
                { value: ALL, label: 'All programme access' },
                { value: 'no-formal-programme', label: 'No programme' },
                ...programs.map((program) => ({ value: program.id, label: program.name })),
              ]}
              placeholder="All programme access"
              searchPlaceholder="Search programmes..."
              emptyMessage="No programme found."
            />
            <TableFilterAutocomplete
              value={overduePriorityFilter}
              onValueChange={(value) => {
                setOverduePriorityFilter(value);
                setOverduePage(1);
              }}
              options={[
                { value: ALL, label: 'All follow-up priority' },
                { value: 'newly-overdue', label: 'Newly overdue' },
                { value: 'late', label: '31-90 days late' },
                { value: 'critical', label: 'More than 90 days late' },
              ]}
              placeholder="All follow-up priority"
              searchPlaceholder="Search priority..."
              emptyMessage="No priority found."
            />
          </div>
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={overduePageRows}
          rowKey={(u) => u.entrepreneur.id}
          emptyMessage="No overdue updates for this programme."
        />
        <TablePagination
          page={overduePage}
          pageSize={overduePageSize}
          totalItems={filteredOverdue.length}
          onPageChange={setOverduePage}
          onPageSizeChange={(next) => {
            setOverduePageSize(next);
            setOverduePage(1);
          }}
        />
      </Card>
      <MessageModal
        open={!!messageTarget}
        onOpenChange={(open) => !open && setMessageTarget(null)}
        recipientName={messageTarget?.entrepreneur.representative ?? 'Entrepreneur'}
        recipientDetail={messageTarget ? `${messageTarget.entrepreneur.businessName} · ${messageTarget.daysWithoutReport} days without report` : undefined}
        defaultSubject={messageTarget ? `Periodic update reminder for ${messageTarget.entrepreneur.businessName}` : ''}
        defaultMessage={messageTarget ? `Hi ${messageTarget.entrepreneur.representative}, please submit your latest periodic update so BID can keep your programme reporting current.` : ''}
      />
    </>
  );
}
