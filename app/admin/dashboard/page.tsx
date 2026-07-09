'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Card, CardHeader } from '@/components/shared/Card';
import { ChartCard } from '@/components/shared/ChartCard';
import { Badge } from '@/components/shared/Badge';
import { Avatar } from '@/components/shared/Avatar';
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { useAdminStore } from '@/lib/stores/admin-store';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import type { Entrepreneur, StageId } from '@/types';
import { useState } from 'react';
import { AssignEntrepreneurModal } from '@/components/admin/AssignEntrepreneurModal';
import { ViewEntrepreneurModal } from '@/components/admin/ViewEntrepreneurModal';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Line,
  XAxis,
  YAxis,
} from 'recharts';

const pendingActions = [
  { id: 'pa-1', label: 'Deliverables awaiting review', count: 12, tone: 'amber' as const, href: routes.admin.deliverableReviews },
  { id: 'pa-2', label: 'Self-registered, unassigned', count: 3, tone: 'red' as const, href: routes.admin.entrepreneurs },
  { id: 'pa-3', label: 'Tool requests pending', count: 2, tone: 'blue' as const, href: routes.admin.toolRequests },
];

const fundsMobilisedTrend = [
  { month: 'Jan', funds: 95 },
  { month: 'Feb', funds: 130 },
  { month: 'Mar', funds: 185 },
  { month: 'Apr', funds: 240 },
];

const chartColors = ['#842751', '#185FA5', '#1D9E75', '#BA7517', '#5c1a38', '#666666'];
const ALL_FILTER = 'all';

const recentSourceOptions = [
  { value: ALL_FILTER, label: 'All sources' },
  { value: 'invited', label: 'Admin-invited' },
  { value: 'self-registered', label: 'Self-registered' },
];

const recentStatusOptions = [
  { value: ALL_FILTER, label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'unassigned', label: 'Unassigned' },
];

export default function AdminDashboardPage() {
  const { entrepreneurs, programs } = useAdminStore();
  const router = useRouter();
  const [assignEntId, setAssignEntId] = useState<string | null>(null);
  const [viewEntId, setViewEntId] = useState<string | null>(null);
  const [recentQuery, setRecentQuery] = useState('');
  const [recentSource, setRecentSource] = useState(ALL_FILTER);
  const [recentStatus, setRecentStatus] = useState(ALL_FILTER);
  const [recentPage, setRecentPage] = useState(1);
  const [recentPageSize, setRecentPageSize] = useState(5);

  const unassigned = entrepreneurs.filter((e) => e.status === 'unassigned').length;
  const recentlyJoined = entrepreneurs.filter((e) => e.source === 'self-registered' || e.source === 'invited');
  const filteredRecentJoiners = recentlyJoined.filter((e) => {
    const needle = recentQuery.trim().toLowerCase();
    const matchesSource = recentSource === ALL_FILTER || e.source === recentSource;
    const matchesStatus = recentStatus === ALL_FILTER || e.status === recentStatus;
    const matchesSearch =
      !needle ||
      [
      e.businessName,
      e.representative,
      e.email,
      e.source,
      e.status,
      sectorById[e.sector]?.label ?? e.sector,
      stageById[e.stage]?.label ?? e.stage,
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle);

    return matchesSource && matchesStatus && matchesSearch;
  });
  const recentPageRows = filteredRecentJoiners.slice(
    (recentPage - 1) * recentPageSize,
    recentPage * recentPageSize,
  );
  const resetRecentPage = (nextPageSize?: number) => {
    if (nextPageSize) setRecentPageSize(nextPageSize);
    setRecentPage(1);
  };
  const activeEntrepreneurs = entrepreneurs.filter((e) => e.status === 'active');
  const fundsMobilised = entrepreneurs.reduce((sum, e) => sum + e.metrics.fundsMobilisedUsd, 0);
  const avgProgress = Math.round(
    activeEntrepreneurs.reduce((sum, e) => sum + e.metrics.trainingProgress, 0) /
      Math.max(activeEntrepreneurs.length, 1),
  );
  const stageBreakdown = (['idea', 'growth', 'scale'] satisfies StageId[]).map((stageId) => {
    const count = entrepreneurs.filter((e) => e.stage === stageId).length;
    return {
      name: stageById[stageId]?.label ?? stageId,
      value: count,
      percent: Math.round((count / Math.max(entrepreneurs.length, 1)) * 100),
    };
  });
  const sectorBreakdown = activeEntrepreneurs.reduce<Array<{ name: string; value: number }>>((acc, e) => {
    const name = sectorById[e.sector]?.label ?? e.sector;
    const existing = acc.find((item) => item.name === name);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name, value: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);
  const totalActiveBusinesses = activeEntrepreneurs.length;
  const programmeHealth = programs.map((program) => {
    const activeCount = program.entrepreneursCount;
    const leftCount = program.leftEntrepreneursCount ?? 0;
    return {
      name: program.name.replace('BID ', '').replace(' Programme', ''),
      completion: program.progress,
      active: activeCount,
      left: leftCount,
      openSeats: Math.max(program.maxEntrepreneurs - activeCount, 0),
      capacity: program.maxEntrepreneurs,
      retention: Math.round((activeCount / Math.max(activeCount + leftCount, 1)) * 100),
    };
  });
  const totalProgrammeLeft = programmeHealth.reduce((sum, program) => sum + program.left, 0);
  const averageProgrammeRetention = Math.round(
    programmeHealth.reduce((sum, program) => sum + program.retention, 0) /
      Math.max(programmeHealth.length, 1),
  );
  const topFundraisers = entrepreneurs
    .filter((entrepreneur) => entrepreneur.metrics.fundsMobilisedUsd > 0)
    .sort((a, b) => b.metrics.fundsMobilisedUsd - a.metrics.fundsMobilisedUsd)
    .slice(0, 4);

  const columns: Column<Entrepreneur>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (e) => (
        <RowActions
          actions={[
            { label: 'View profile', onSelect: () => setViewEntId(e.id) },
            ...(e.status === 'unassigned'
              ? [{ label: 'Manage programmes', onSelect: () => setAssignEntId(e.id) }]
              : []),
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'name',
      header: 'Name',
      cell: (e) => (
        <button
          type="button"
          onClick={() => setViewEntId(e.id)}
          className="flex min-w-[180px] items-center gap-2 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          <Avatar initials={e.initials} size={24} />
          <span className="font-medium text-ink transition-colors group-hover:text-bid">{e.representative}</span>
        </button>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      cell: (e) =>
        e.source === 'self-registered' ? (
          <Badge tone="neutral">Self-registered</Badge>
        ) : (
          <Badge tone="brand">Admin-invited</Badge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (e) =>
        e.status === 'unassigned' ? (
          <Badge tone="red">Unassigned</Badge>
        ) : (
          <Badge tone="green">Active</Badge>
        ),
    },
  ];

  const assignTarget = entrepreneurs.find((e) => e.id === assignEntId);
  const viewTarget = entrepreneurs.find((e) => e.id === viewEntId);

  return (
    <>
      <PageHeader title="Platform overview" description="Live data across all programmes" />
      <MetricGrid>
        <StatCard label="Total entrepreneurs" value={entrepreneurs.length} subline={`${programs.length} active programmes`} dotColor="bid" accent="bid" />
        <StatCard label="Funds mobilised" value={`$${Math.round(fundsMobilised / 1000)}k`} subline="Tracked across cohorts" dotColor="info" accent="info" />
        <StatCard label="Avg. training progress" value={`${avgProgress}%`} subline="+8% vs last period" dotColor="success" accent="success" />
        <StatCard label="Without programme" value={unassigned} subline="Needs programme" dotColor="warning" valueClassName="text-bid" accent="warning" />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <ChartCard
          title="Programme health"
          description={`${totalProgrammeLeft} entrepreneurs left across active programmes · ${averageProgrammeRetention}% average retention`}
          legend={[
            { label: 'Active participants', colorClassName: 'bg-info' },
            { label: 'Left programme', colorClassName: 'bg-warning' },
            { label: 'Open seats', colorClassName: 'bg-ink-muted' },
            { label: 'Completion %', colorClassName: 'bg-bid' },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={programmeHealth} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis yAxisId="count" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(132,39,81,0.06)' }} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              <Bar yAxisId="count" dataKey="active" name="Active participants" stackId="people" fill="#185FA5" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="count" dataKey="left" name="Left programme" stackId="people" fill="#BA7517" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="count" dataKey="openSeats" name="Open seats" stackId="people" fill="#8A8A8A" radius={[8, 8, 0, 0]} />
              <Line yAxisId="percent" type="monotone" dataKey="completion" name="Completion %" stroke="#842751" strokeWidth={3} dot={{ r: 4, fill: '#842751' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Sector mix"
          description="Active entrepreneurs by sector"
          legend={sectorBreakdown.slice(0, 5).map((item, index) => ({
            label: `${item.name} (${item.value})`,
            colorClassName: ['bg-bid', 'bg-info', 'bg-success', 'bg-warning', 'bg-ink-muted'][index] ?? 'bg-line',
          }))}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-ink text-3xl font-semibold">
                {totalActiveBusinesses}
              </text>
              <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-ink-muted text-xs">
                Active businesses
              </text>
              <Pie data={sectorBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>
                {sectorBreakdown.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr]">
        <ChartCard
          title="Funds momentum"
          description={`$${Math.round(fundsMobilised / 1000)}k mobilised across reporting entrepreneurs`}
          legend={[{ label: 'Funds mobilised ($k)', colorClassName: 'bg-bid' }]}
          className="min-h-[430px]"
          bodyClassName="h-auto"
        >
          <div className="h-[185px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fundsMobilisedTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(132,39,81,0.06)' }} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
                <Bar dataKey="funds" name="Funds mobilised ($k)" fill="#842751" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-ink">Top entrepreneurs</div>
              <div className="text-sm text-ink-muted">By funds mobilised</div>
            </div>
            <div className="grid gap-2">
              {topFundraisers.map((entrepreneur, index) => (
                <button
                  key={entrepreneur.id}
                  type="button"
                  onClick={() => setViewEntId(entrepreneur.id)}
                  className="flex items-center justify-between rounded-lg bg-surface-subtle px-3 py-2 text-left transition hover:bg-bid-light"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-bid">{index + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{entrepreneur.businessName}</span>
                      <span className="block text-xs text-ink-muted">{sectorById[entrepreneur.sector]?.label ?? entrepreneur.sector}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-ink">${Math.round(entrepreneur.metrics.fundsMobilisedUsd / 1000)}k</span>
                </button>
              ))}
            </div>
          </div>
        </ChartCard>

        <Card>
          <CardHeader
            title="Stage movement"
            description="Pipeline maturity across all entrepreneurs"
          />
          <div className="grid gap-3">
            {stageBreakdown.map((s, index) => (
              <div key={s.name} className="rounded-xl bg-surface-subtle p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-ink-muted">{s.value} entrepreneurs</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className={index === 0 ? 'h-full rounded-full bg-warning' : index === 1 ? 'h-full rounded-full bg-bid' : 'h-full rounded-full bg-success'}
                    style={{ width: `${s.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="my-4 h-px bg-line" />
          <CardHeader title="Pending actions" className="mb-2" />
          <div className="grid gap-2">
            {pendingActions.map((a) => (
              <button
                key={a.id}
                onClick={() => router.push(a.href)}
                className="flex items-center justify-between rounded-lg bg-surface-subtle px-3 py-2 text-left text-sm transition-colors hover:bg-bid-light hover:text-bid"
              >
                <span>{a.label}</span>
                <Badge tone={a.tone}>{a.count}</Badge>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Card>
          <CardHeader
            title="Recently joined"
            description="New entrepreneurs that need the team’s attention"
          />
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Search new joiners</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                Find entrepreneurs by name, source, sector, stage, or status.
              </div>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_180px] lg:w-[720px]">
              <TableFilterInput
                icon
                placeholder="Search recent joiners..."
                value={recentQuery}
                onChange={(event) => {
                  setRecentQuery(event.target.value);
                  resetRecentPage();
                }}
              />
              <TableFilterAutocomplete
                value={recentSource}
                onValueChange={(value) => {
                  setRecentSource(value);
                  resetRecentPage();
                }}
                options={recentSourceOptions}
                placeholder="All sources"
                searchPlaceholder="Search sources..."
                emptyMessage="No source found."
              />
              <TableFilterAutocomplete
                value={recentStatus}
                onValueChange={(value) => {
                  setRecentStatus(value);
                  resetRecentPage();
                }}
                options={recentStatusOptions}
                placeholder="All statuses"
                searchPlaceholder="Search statuses..."
                emptyMessage="No status found."
              />
            </div>
          </TableToolbar>
          <DataTable
            columns={columns}
            rows={recentPageRows}
            rowKey={(e) => e.id}
            emptyMessage="No recent joiners."
          />
          <TablePagination
            page={recentPage}
            pageSize={recentPageSize}
            totalItems={filteredRecentJoiners.length}
            pageSizeOptions={[5, 10, 25]}
            onPageChange={setRecentPage}
            onPageSizeChange={resetRecentPage}
          />
        </Card>
      </div>

      {assignTarget && (
        <AssignEntrepreneurModal
          entrepreneur={assignTarget}
          open={!!assignTarget}
          onOpenChange={(o) => !o && setAssignEntId(null)}
        />
      )}
      {viewTarget && (
        <ViewEntrepreneurModal
          entrepreneur={viewTarget}
          open={!!viewTarget}
          onOpenChange={(o) => !o && setViewEntId(null)}
          onAssign={(entrepreneur) => {
            setViewEntId(null);
            setAssignEntId(entrepreneur.id);
          }}
        />
      )}
    </>
  );
}
