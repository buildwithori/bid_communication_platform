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
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const pendingActions = [
  { id: 'pa-1', label: 'Deliverables awaiting review', count: 12, tone: 'amber' as const, href: routes.admin.deliverableReviews },
  { id: 'pa-2', label: 'Self-registered, unassigned', count: 3, tone: 'red' as const, href: routes.admin.entrepreneurs },
  { id: 'pa-3', label: 'Tool requests pending', count: 2, tone: 'blue' as const, href: routes.admin.toolRequests },
  { id: 'pa-4', label: 'Documents to generate', count: 4, tone: 'neutral' as const, href: routes.admin.documents },
];

const impactTrend = [
  { month: 'Jan', funds: 95, jobs: 28, completion: 38 },
  { month: 'Feb', funds: 130, jobs: 35, completion: 44 },
  { month: 'Mar', funds: 185, jobs: 47, completion: 52 },
  { month: 'Apr', funds: 240, jobs: 62, completion: 61 },
];

const chartColors = ['#842751', '#185FA5', '#1D9E75', '#BA7517', '#5c1a38', '#666666'];

export default function AdminDashboardPage() {
  const { entrepreneurs, programs } = useAdminStore();
  const router = useRouter();
  const [assignEntId, setAssignEntId] = useState<string | null>(null);
  const [viewEntId, setViewEntId] = useState<string | null>(null);
  const [recentQuery, setRecentQuery] = useState('');
  const [recentPage, setRecentPage] = useState(1);
  const [recentPageSize, setRecentPageSize] = useState(5);

  const unassigned = entrepreneurs.filter((e) => e.status === 'unassigned').length;
  const recentlyJoined = entrepreneurs.filter((e) => e.source === 'self-registered' || e.source === 'invited');
  const filteredRecentJoiners = recentlyJoined.filter((e) => {
    const needle = recentQuery.trim().toLowerCase();
    if (!needle) return true;
    return [
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
  const jobsCreated = entrepreneurs.reduce((sum, e) => sum + e.metrics.jobsCreated, 0);
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
  const sectorBreakdown = entrepreneurs.reduce<Array<{ name: string; value: number }>>((acc, e) => {
    const name = sectorById[e.sector]?.label ?? e.sector;
    const existing = acc.find((item) => item.name === name);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name, value: 1 });
    }
    return acc;
  }, []);
  const programmeHealth = programs.map((program) => ({
    name: program.name.replace('BID ', '').replace(' Programme', ''),
    progress: program.progress,
    enrolled: entrepreneurs.filter((e) => e.programmeId === program.id).length,
    capacity: program.maxEntrepreneurs,
  }));

  const columns: Column<Entrepreneur>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (e) => (
        <RowActions
          actions={[
            e.status === 'unassigned'
              ? { label: 'Assign to programme', onSelect: () => setAssignEntId(e.id) }
              : { label: 'View profile', onSelect: () => setViewEntId(e.id) },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'name',
      header: 'Name',
      cell: (e) => (
        <div className="flex items-center gap-2">
          <Avatar initials={e.initials} size={24} />
          <span>{e.representative}</span>
        </div>
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
        <StatCard label="Unassigned entrepreneurs" value={unassigned} subline="Awaiting programme" dotColor="warning" valueClassName="text-bid" accent="warning" />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <ChartCard
          title="Programme health"
          description="Progress and enrollment pressure by active programme"
          legend={[
            { label: 'Completion', colorClassName: 'bg-bid' },
            { label: 'Enrolled entrepreneurs', colorClassName: 'bg-info' },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={programmeHealth} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(132,39,81,0.06)' }} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              <Bar dataKey="progress" name="Completion %" fill="#842751" radius={[8, 8, 0, 0]} />
              <Bar dataKey="enrolled" name="Enrolled" fill="#185FA5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Sector mix"
          description="Where entrepreneurs are concentrated"
          legend={sectorBreakdown.slice(0, 5).map((item, index) => ({
            label: item.name,
            colorClassName: ['bg-bid', 'bg-info', 'bg-success', 'bg-warning', 'bg-ink-muted'][index] ?? 'bg-line',
          }))}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
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
          title="Impact momentum"
          description={`$${Math.round(fundsMobilised / 1000)}k mobilised and ${jobsCreated} jobs captured this cycle`}
          legend={[
            { label: 'Funds mobilised ($k)', colorClassName: 'bg-bid' },
            { label: 'Jobs created', colorClassName: 'bg-success' },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={impactTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="adminFunds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#842751" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#842751" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="adminJobs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="funds" name="Funds ($k)" stroke="#842751" fill="url(#adminFunds)" strokeWidth={3} />
              <Area type="monotone" dataKey="jobs" name="Jobs" stroke="#1D9E75" fill="url(#adminJobs)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
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
            <div className="w-full sm:w-[320px]">
              <TableFilterInput
                icon
                placeholder="Search recent joiners..."
                value={recentQuery}
                onChange={(event) => {
                  setRecentQuery(event.target.value);
                  resetRecentPage();
                }}
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
