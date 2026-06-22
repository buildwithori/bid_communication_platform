'use client';

import * as React from 'react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { EntrepreneurModal } from '@/components/admin/EntrepreneurModal';
import { AssignEntrepreneurModal } from '@/components/admin/AssignEntrepreneurModal';
import { ViewEntrepreneurModal } from '@/components/admin/ViewEntrepreneurModal';
import { useAdminStore } from '@/lib/stores/admin-store';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import { programById } from '@/lib/mock-data/programs';
import type { Entrepreneur } from '@/types';

export default function AdminEntrepreneursPage() {
  const { entrepreneurs, programs } = useAdminStore();
  const [query, setQuery] = React.useState('');
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Entrepreneur | null>(null);
  const [viewTarget, setViewTarget] = React.useState<Entrepreneur | null>(null);
  const [assignTarget, setAssignTarget] = React.useState<Entrepreneur | null>(null);

  const filtered = entrepreneurs.filter((e) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      e.businessName.toLowerCase().includes(q) ||
      e.representative.toLowerCase().includes(q) ||
      e.country.toLowerCase().includes(q) ||
      e.sector.toLowerCase().includes(q)
    );
  });

  const columns: Column<Entrepreneur>[] = [
    {
      key: 'business',
      header: 'Business',
      cell: (e) => <span className="font-medium">{e.businessName}</span>,
    },
    { key: 'rep', header: 'Representative', cell: (e) => e.representative },
    {
      key: 'sector',
      header: 'Sector',
      cell: (e) => <Badge tone={sectorById[e.sector].color}>{sectorById[e.sector].label}</Badge>,
    },
    { key: 'country', header: 'Country', cell: (e) => e.country },
    {
      key: 'stage',
      header: 'Stage',
      cell: (e) => <Badge tone={stageById[e.stage].color}>{stageById[e.stage].label}</Badge>,
    },
    {
      key: 'programme',
      header: 'Programme',
      cell: (e) =>
        programById(e.programmeId)?.name ?? <span className="text-ink-faint">—</span>,
    },
    {
      key: 'source',
      header: 'Source',
      cell: (e) => (
        <Badge tone={e.source === 'invited' ? 'brand' : 'neutral'}>
          {e.source === 'invited' ? 'Invited' : 'Self-registered'}
        </Badge>
      ),
    },
    {
      key: 'goal',
      header: 'Goal',
      cell: (e) =>
        e.goal.type === 'fundraising' && e.goal.amountUsd
          ? `Fundraising $${(e.goal.amountUsd / 1000).toFixed(0)}k`
          : e.goal.type === 'milestone'
            ? 'Milestone'
            : 'Programme',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (e) => {
        const tone =
          e.status === 'active' ? 'green' : e.status === 'unassigned' ? 'red' : 'neutral';
        return (
          <Badge tone={tone}>
            {e.status === 'active' ? 'Active' : e.status === 'unassigned' ? 'Unassigned' : 'Graduated'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (e) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setEditTarget(e)}>
            Edit
          </Button>
          {e.status === 'unassigned' ? (
            <Button size="sm" onClick={() => setAssignTarget(e)}>
              Assign
            </Button>
          ) : (
            <Button size="sm" onClick={() => setViewTarget(e)}>
              View
            </Button>
          )}
        </div>
      ),
    },
  ];

  const active = entrepreneurs.filter((e) => e.status === 'active').length;
  const unassigned = entrepreneurs.filter((e) => e.status === 'unassigned').length;
  const graduated = entrepreneurs.filter((e) => e.status === 'graduated').length;

  return (
    <>
      <PageHeader
        title="Entrepreneurs"
        description="Manage entrepreneurs, both admin-invited and self-registered"
        actions={
          <>
            <Button variant="outline" onClick={() => import('sonner').then(({ toast }) => toast.success('Exporting CSV…'))}>
              Export CSV
            </Button>
            <Button onClick={() => setAddOpen(true)}>+ Add entrepreneur</Button>
          </>
        }
      />
      <Notice>
        Entrepreneurs can join two ways: you invite them directly (auto-assigned if you
        choose), or they self-register from the website and arrive{' '}
        <strong>unassigned</strong> until you assign them to a programme.
      </Notice>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard label="Total" value={entrepreneurs.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Unassigned" value={unassigned} valueClassName="text-bid" />
        <StatCard label="Graduated" value={graduated} />
      </div>
      <Card className="mt-3">
        <CardHeader
          title="All entrepreneurs"
          actions={
            <input
              placeholder="Search any column…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-[30px] w-[140px] rounded-[7px] border-[0.5px] border-line-strong bg-surface-panel px-2 text-[10px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none"
            />
          }
        />
        <DataTable columns={columns} rows={filtered} rowKey={(e) => e.id} emptyMessage="No entrepreneurs match." />
      </Card>

      <EntrepreneurModal open={addOpen} onOpenChange={setAddOpen} mode="add" />
      {editTarget && (
        <EntrepreneurModal
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode="edit"
          entrepreneur={editTarget}
        />
      )}
      {viewTarget && (
        <ViewEntrepreneurModal
          open={!!viewTarget}
          onOpenChange={(o) => !o && setViewTarget(null)}
          entrepreneur={viewTarget}
          onEdit={(e) => {
            setViewTarget(null);
            setEditTarget(e);
          }}
        />
      )}
      {assignTarget && (
        <AssignEntrepreneurModal
          open={!!assignTarget}
          onOpenChange={(o) => !o && setAssignTarget(null)}
          entrepreneur={assignTarget}
        />
      )}
    </>
  );
}
