'use client';

import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { BarChartRow } from '@/components/shared/BarChartRow';
import { Button } from '@/components/shared/Button';
import { DataTable, type Column } from '@/components/shared/DataTable';
import {
  reportingMetrics,
  jobsByProgram,
  fundsByProgram,
  overdueUpdaters,
  reportingByProgramme,
} from '@/lib/mock-data';
import { programs } from '@/lib/mock-data/programs';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { toast } from 'sonner';

const ALL = 'all';

export default function AdminReportingPage() {
  const [selectedProgramme, setSelectedProgramme] = useState<string>(ALL);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const programmeData =
    selectedProgramme !== ALL ? reportingByProgramme[selectedProgramme] : null;

  const metrics = programmeData?.metrics ?? reportingMetrics;
  const jobs = programmeData?.jobsByProgram ?? jobsByProgram;
  const funds = programmeData?.fundsByProgram ?? fundsByProgram;

  const filteredOverdue =
    selectedProgramme === ALL
      ? overdueUpdaters
      : overdueUpdaters.filter((u) => u.programmeId === selectedProgramme);

  const selectedLabel =
    selectedProgramme === ALL
      ? 'All programmes'
      : programs.find((p) => p.id === selectedProgramme)?.name ?? 'All programmes';

  const columns: Column<(typeof overdueUpdaters)[number]>[] = [
    {
      key: 'ent',
      header: 'Entrepreneur',
      cell: (u) => {
        const ent = entrepreneurs.find((e) => e.id === u.entrepreneurId);
        return ent?.businessName ?? u.entrepreneurId;
      },
    },
    {
      key: 'prog',
      header: 'Programme',
      cell: (u) => {
        const prog = programs.find((p) => p.id === u.programmeId);
        return prog?.name ?? '—';
      },
    },
    { key: 'last', header: 'Last update', cell: (u) => u.lastUpdateLabel },
    {
      key: 'action',
      header: '',
      cell: () => (
        <Button variant="outline" size="sm" onClick={() => toast.success('Reminder sent!')}>
          Send reminder
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Reporting & analytics"
        description="Programme performance, jobs created and funds mobilised"
        actions={
          <div className="flex items-center gap-2">
            {/* Programme selector */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-medium text-ink shadow-sm transition hover:bg-surface-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <span className="max-w-[180px] truncate">{selectedLabel}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-ink-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1.5 min-w-[220px] overflow-hidden rounded-lg border border-border bg-white shadow-lg">
                    <DropdownItem
                      label="All programmes"
                      active={selectedProgramme === ALL}
                      onClick={() => { setSelectedProgramme(ALL); setDropdownOpen(false); }}
                    />
                    <div className="mx-3 my-1 border-t border-border/60" />
                    {programs.map((p) => (
                      <DropdownItem
                        key={p.id}
                        label={p.name}
                        active={selectedProgramme === p.id}
                        onClick={() => { setSelectedProgramme(p.id); setDropdownOpen(false); }}
                      />
                    ))}
                  </div>
                </>
              )}
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
        <strong>How this data is collected:</strong> entrepreneurs submit a periodic
        update (quarterly, from their profile) reporting jobs created (by gender) and
        funds mobilised. Admins can also enter or correct figures directly from an
        entrepreneur&apos;s profile. Figures below reflect submitted updates only —
        data prior to this feature launching is not available.
      </Notice>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Jobs created (period)"
          value={metrics.jobsCreated}
          subline={`${metrics.jobsWomen} women · ${metrics.jobsMen} men`}
          dotColor="bid"
        />
        <StatCard
          label="Funds mobilised (period)"
          value={`$${metrics.fundsMobilisedUsd / 1000}k`}
          subline={`Across ${metrics.entrepreneursWithFunds} entrepreneurs`}
          dotColor="info"
        />
        <StatCard
          label="Update submission rate"
          value={`${metrics.updateSubmissionRate}%`}
          subline={`${metrics.submittedUpdatesThisQuarter} of ${metrics.totalEntrepreneurs} this quarter`}
          dotColor="warning"
        />
        <StatCard
          label="Training completion rate"
          value={`${metrics.trainingCompletionRate}%`}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader title="Jobs created by programme" />
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
          <CardHeader title="Funds mobilised by programme" />
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

      <Card className="mt-3">
        <CardHeader title="Entrepreneurs with overdue updates" />
        <DataTable
          columns={columns}
          rows={filteredOverdue}
          rowKey={(u) => u.entrepreneurId}
          emptyMessage="No overdue updates for this programme."
        />
      </Card>
    </>
  );
}

function DropdownItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center px-3 py-2 text-left text-xs transition hover:bg-surface-subtle ${
        active ? 'font-medium text-brand' : 'text-ink'
      }`}
    >
      {active && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-brand" />}
      <span className={active ? '' : 'ml-3.5'}>{label}</span>
    </button>
  );
}
