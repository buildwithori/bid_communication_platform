'use client';

import * as React from 'react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Avatar } from '@/components/shared/Avatar';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { TrainerModal } from '@/components/admin/TrainerModal';
import { useAdminStore } from '@/lib/stores/admin-store';
import { sectorById } from '@/lib/mock-data/definitions';
import { entrepreneurs as seedEntrepreneurs } from '@/lib/mock-data/entrepreneurs';
import type { Trainer } from '@/types';

function TrainerCardRow({
  trainer,
  onEdit,
  onManage,
}: {
  trainer: Trainer;
  onEdit: () => void;
  onManage: () => void;
}) {
  const tone = trainer.accessLevel === 'guest' ? 'amber' : 'green';
  const accessLabel = trainer.accessLevel === 'guest' ? 'Guest · temporary' : 'Full access';
  return (
    <Card className="flex gap-3">
      <Avatar
        initials={trainer.initials}
        size={36}
        tone={trainer.accessLevel === 'guest' ? 'amber' : 'brand'}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium">{trainer.fullName}</div>
          <Badge tone={tone}>{accessLabel}</Badge>
        </div>
        <div className="mt-0.5 mb-1.5 text-[10px] text-ink-muted">
          {trainer.role}
        </div>
        {trainer.specialisms.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {trainer.specialisms.map((s) => (
              <Badge key={s} tone={sectorById[s]?.color ?? 'neutral'}>
                {sectorById[s]?.label ?? s}
              </Badge>
            ))}
          </div>
        )}
        <div className="text-[10px] text-ink-muted">
          {trainer.metrics.entrepreneursCount} entrepreneurs · Avg. satisfaction{' '}
          <strong>
            {trainer.metrics.satisfactionAvg.toFixed(1)}/5
          </strong>{' '}
          <span className="text-ink-faint">
            (from {trainer.metrics.satisfactionRatingsCount} ratings)
          </span>
        </div>
        <div className="mt-2 flex gap-1">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" onClick={onManage}>
            Manage
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function AdminTrainersPage() {
  const { trainers } = useAdminStore();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Trainer | null>(null);
  const [manageTarget, setManageTarget] = React.useState<Trainer | null>(null);

  const columns: Column<Trainer>[] = [
    {
      key: 'name',
      header: 'Trainer',
      cell: (t) => (
        <div className="flex items-center gap-2">
          <Avatar initials={t.initials} size={24} />
          <span>{t.fullName}</span>
        </div>
      ),
    },
    {
      key: 'access',
      header: 'Access level',
      cell: (t) => (
        <Badge tone={t.accessLevel === 'guest' ? 'amber' : 'green'}>
          {t.accessLevel === 'guest' ? 'Guest · temporary' : 'Full access'}
        </Badge>
      ),
    },
    { key: 'spec', header: 'Specialisms', cell: (t) => t.specialisms.map((s) => sectorById[s]?.label ?? s).join(', ') || '—' },
    { key: 'ent', header: 'Entrepreneurs', cell: (t) => t.metrics.entrepreneursCount },
    { key: 'sessions', header: 'Sessions (Apr)', cell: (t) => t.metrics.sessionsThisMonth },
    { key: 'sat', header: 'Avg. satisfaction', cell: (t) => `${t.metrics.satisfactionAvg.toFixed(1)}/5 (${t.metrics.satisfactionRatingsCount})` },
    {
      key: 'status',
      header: 'Status',
      cell: (t) =>
        t.metrics.status === 'active' ? (
          <Badge tone="green">Active</Badge>
        ) : t.metrics.status === 'expires-soon' ? (
          <Badge tone="amber">Expires {t.accessExpiresOn ? new Date(t.accessExpiresOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'soon'}</Badge>
        ) : (
          <Badge tone="neutral">Inactive</Badge>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Trainers"
        description="Manage trainer profiles, access levels and workload"
        actions={<Button onClick={() => setAddOpen(true)}>+ Add trainer</Button>}
      />
      <Notice>
        Trainers log into a scoped view of the admin console — they only see their own
        assigned entrepreneurs, programmes, and booked sessions, not the full console.
      </Notice>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        {trainers.map((t) => (
          <TrainerCardRow
            key={t.id}
            trainer={t}
            onEdit={() => setEditTarget(t)}
            onManage={() => setManageTarget(t)}
          />
        ))}
      </div>
      <Card className="mt-3">
        <CardHeader title="Trainer workload overview" />
        <DataTable columns={columns} rows={trainers} rowKey={(t) => t.id} />
      </Card>

      <TrainerModal open={addOpen} onOpenChange={setAddOpen} mode="add" />
      {editTarget && (
        <TrainerModal
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode="edit"
          trainer={editTarget}
        />
      )}
      {manageTarget && (
        <Modal
          open={!!manageTarget}
          onOpenChange={(o) => !o && setManageTarget(null)}
          title={`${manageTarget.fullName} – manage assignments`}
          width="wide"
        >
          <div className="mb-3 text-[11px] text-ink-muted">
            Currently assigned: {manageTarget.metrics.entrepreneursCount} entrepreneurs ·
            Sees only their own programmes & sessions when logged in
          </div>
          <AssignedTable trainer={manageTarget} />
          <Button className="mt-3 w-full">Save changes</Button>
        </Modal>
      )}
    </>
  );
}

function AssignedTable({ trainer }: { trainer: Trainer }) {
  // Use the static seed for the assigned-entrepreneurs list (a real
  // implementation would query by trainerId from the store).
  const assigned = seedEntrepreneurs.filter((e) => e.trainerId === trainer.id);
  return (
    <DataTable
      columns={[
        {
          key: 'name',
          header: 'Entrepreneur',
          cell: (e) => (
            <div className="flex items-center gap-2">
              <Avatar initials={e.initials} size={24} />
              <span>{e.representative}</span>
            </div>
          ),
        },
        { key: 'biz', header: 'Business', cell: (e) => e.businessName },
        {
          key: 'stage',
          header: 'Stage',
          cell: (e) => <Badge tone="brand">{e.stage}</Badge>,
        },
        {
          key: 'action',
          header: '',
          cell: () => (
            <Button
              variant="outline"
              size="sm"
              onClick={() => import('sonner').then(({ toast }) => toast.success('Removed from trainer'))}
            >
              Remove
            </Button>
          ),
        },
      ]}
      rows={assigned}
      rowKey={(e) => e.id}
      emptyMessage="No entrepreneurs assigned yet."
    />
  );
}
