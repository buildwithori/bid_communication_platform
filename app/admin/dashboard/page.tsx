'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { BarChartRow } from '@/components/shared/BarChartRow';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Avatar } from '@/components/shared/Avatar';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { useAdminStore } from '@/lib/stores/admin-store';
import { pendingActions } from '@/lib/mock-data';
import { programById } from '@/lib/mock-data/programs';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import type { Entrepreneur } from '@/types';
import { useState } from 'react';
import { AssignEntrepreneurModal } from '@/components/admin/AssignEntrepreneurModal';
import { toast } from 'sonner';

const stageBreakdown = [
  { id: 'idea', label: 'Idea', percent: 28, count: 13 },
  { id: 'growth', label: 'Growth', percent: 55, count: 26 },
  { id: 'scale', label: 'Scale', percent: 17, count: 8 },
];

export default function AdminDashboardPage() {
  const { entrepreneurs, programs } = useAdminStore();
  const [assignEntId, setAssignEntId] = useState<string | null>(null);

  const active = entrepreneurs.filter((e) => e.status === 'active').length;
  const unassigned = entrepreneurs.filter((e) => e.status === 'unassigned').length;
  const graduated = entrepreneurs.filter((e) => e.status === 'graduated').length;
  const recentlyJoined = entrepreneurs
    .filter((e) => e.source === 'self-registered' || e.source === 'invited')
    .slice(0, 3);

  const columns: Column<Entrepreneur>[] = [
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
    {
      key: 'action',
      header: '',
      cell: (e) =>
        e.status === 'unassigned' ? (
          <Button variant="primary" size="sm" onClick={() => setAssignEntId(e.id)}>
            Assign
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => toast.info('View (demo)')}>
            View
          </Button>
        ),
    },
  ];

  const assignTarget = entrepreneurs.find((e) => e.id === assignEntId);

  return (
    <>
      <PageHeader title="Platform overview" description="Live data across all cohorts and programs" />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard label="Total entrepreneurs" value={entrepreneurs.length} subline={`${programs.length} active programmes`} dotColor="bid" />
        <StatCard label="Active trainers" value={9} subline="6 programs" dotColor="info" />
        <StatCard label="Avg. training progress" value={61} subline="+8% vs last cohort" dotColor="success" />
        <StatCard label="Unassigned entrepreneurs" value={unassigned} subline="Awaiting programme" dotColor="warning" valueClassName="text-bid" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader title="Entrepreneurs by stage" />
          {stageBreakdown.map((s) => (
            <BarChartRow
              key={s.id}
              label={s.label}
              value={String(s.count)}
              percent={s.percent}
              accent="bid"
            />
          ))}
          <div className="my-3 h-px bg-line" />
          <CardHeader title="Pending actions" className="mb-2" />
          <div className="flex flex-col gap-1.5">
            {pendingActions.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-[11px]">
                <span>{a.label}</span>
                <Badge tone={a.tone}>{a.count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recently joined" />
          <DataTable
            columns={columns}
            rows={recentlyJoined}
            rowKey={(e) => e.id}
            emptyMessage="No recent joiners."
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
    </>
  );
}
