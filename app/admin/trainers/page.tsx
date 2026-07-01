'use client';

import * as React from 'react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Avatar } from '@/components/shared/Avatar';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
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
    <Card className="flex gap-4">
      <Avatar
        initials={trainer.initials}
        size={36}
        tone={trainer.accessLevel === 'guest' ? 'amber' : 'brand'}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="text-base font-semibold">{trainer.fullName}</div>
          <Badge tone={tone}>{accessLabel}</Badge>
        </div>
        <div className="mb-2 mt-1 text-sm text-ink-muted">
          {trainer.role}
        </div>
        {trainer.specialisms.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {trainer.specialisms.map((s) => (
              <Badge key={s} tone={sectorById[s]?.color ?? 'neutral'}>
                {sectorById[s]?.label ?? s}
              </Badge>
            ))}
          </div>
        )}
        <div className="text-sm leading-5 text-ink-muted">
          {trainer.metrics.entrepreneursCount} entrepreneurs · Avg. satisfaction{' '}
          <strong>
            {trainer.metrics.satisfactionAvg.toFixed(1)}/5
          </strong>{' '}
          <span className="text-ink-faint">
            (from {trainer.metrics.satisfactionRatingsCount} ratings)
          </span>
        </div>
        <CalendarStatusLine provider={trainer.calendarProvider} />
        <div className="mt-3 flex gap-2">
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

function CalendarStatusLine({ provider }: { provider?: 'google' | 'calendly' | 'none' }) {
  if (provider === 'google') {
    return <div className="mt-2 text-sm font-medium text-success-dark">Google Calendar connected</div>;
  }
  if (provider === 'calendly') {
    return <div className="mt-2 text-sm font-medium text-success-dark">Calendly connected</div>;
  }
  return <div className="mt-2 text-sm font-medium text-danger">No calendar connected</div>;
}

export default function AdminTrainersPage() {
  const { trainers } = useAdminStore();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Trainer | null>(null);
  const [manageTarget, setManageTarget] = React.useState<Trainer | null>(null);
  const [query, setQuery] = React.useState('');
  const [accessFilter, setAccessFilter] = React.useState<'all' | Trainer['accessLevel']>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | Trainer['metrics']['status']>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const filteredTrainers = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return trainers.filter((trainer) => {
      const specialisms = trainer.specialisms.map((specialism) => sectorById[specialism]?.label ?? specialism).join(' ');
      const matchesQuery =
        !needle ||
        [trainer.fullName, trainer.email, trainer.role, specialisms, trainer.calendarProvider ?? 'none']
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesAccess = accessFilter === 'all' || trainer.accessLevel === accessFilter;
      const matchesStatus = statusFilter === 'all' || trainer.metrics.status === statusFilter;
      return matchesQuery && matchesAccess && matchesStatus;
    });
  }, [accessFilter, query, statusFilter, trainers]);

  React.useEffect(() => {
    setPage(1);
  }, [accessFilter, query, statusFilter, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTrainers.slice(start, start + pageSize);
  }, [filteredTrainers, page, pageSize]);

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
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">Filter trainers</div>
          <div className="mt-0.5 text-sm text-ink-muted">
            Search by name, role, specialism, email, or calendar provider.
          </div>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[260px_150px_160px]">
          <TableFilterInput
            icon
            placeholder="Search trainers..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <TableFilterSelect value={accessFilter} onChange={(event) => setAccessFilter(event.target.value as typeof accessFilter)}>
            <option value="all">All access</option>
            <option value="full">Full access</option>
            <option value="guest">Guest access</option>
          </TableFilterSelect>
          <TableFilterSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expires-soon">Expires soon</option>
            <option value="inactive">Inactive</option>
          </TableFilterSelect>
        </div>
      </TableToolbar>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {filteredTrainers.slice(0, 6).map((t) => (
          <TrainerCardRow
            key={t.id}
            trainer={t}
            onEdit={() => setEditTarget(t)}
            onManage={() => setManageTarget(t)}
          />
        ))}
      </div>
      <Card className="mt-4">
        <CardHeader
          title="Trainer workload overview"
          description={`${filteredTrainers.length} trainer${filteredTrainers.length === 1 ? '' : 's'} in this view`}
        />
        <DataTable columns={columns} rows={pageRows} rowKey={(t) => t.id} />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredTrainers.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
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
          <div className="mb-4 rounded-xl bg-surface-subtle px-4 py-3 text-sm leading-6 text-ink-muted">
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
  const [query, setQuery] = React.useState('');
  // Use the static seed for the assigned-entrepreneurs list (a real
  // implementation would query by trainerId from the store).
  const assigned = seedEntrepreneurs.filter((e) => e.trainerId === trainer.id);
  const filteredAssigned = assigned.filter((e) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [e.representative, e.businessName, e.email, e.stage, e.country]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
  return (
    <>
      <TableToolbar className="mb-3">
        <div>
          <div className="text-sm font-medium text-ink">Assigned entrepreneurs</div>
          <div className="mt-0.5 text-sm text-ink-muted">
            Search before changing trainer ownership.
          </div>
        </div>
        <div className="w-full sm:w-[300px]">
          <TableFilterInput
            icon
            placeholder="Search assignments..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </TableToolbar>
      <DataTable
        columns={[
          {
            key: 'action',
            header: 'Action',
            cell: () => (
              <RowActions
                actions={[
                  {
                    label: 'Remove from trainer',
                    destructive: true,
                    onSelect: () => import('sonner').then(({ toast }) => toast.success('Removed from trainer')),
                  },
                ]}
              />
            ),
            className: 'w-[84px]',
          },
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
        ]}
        rows={filteredAssigned}
        rowKey={(e) => e.id}
        emptyMessage="No entrepreneurs match this search."
        tableClassName="min-w-[620px]"
      />
    </>
  );
}
