'use client';

import { useMemo, useState } from 'react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { toast } from 'sonner';
import { adminSessions, type AdminSession } from '@/lib/mock-data/admin-workflows';

const columns: Column<AdminSession>[] = [
  {
    key: 'actions',
    header: 'Action',
    cell: (s) => (
      <RowActions
        actions={[
          s.status === 'confirmed'
            ? { label: 'Send reminder', onSelect: () => toast.success('Reminder sent!') }
            : { label: 'Nudge trainer', onSelect: () => toast.success('Trainer notified to confirm') },
        ]}
      />
    ),
    className: 'w-[84px]',
  },
  { key: 'ent', header: 'Entrepreneur', cell: (s) => s.entrepreneurName },
  { key: 'trainer', header: 'Trainer', cell: (s) => s.trainerName },
  { key: 'dt', header: 'Date / time', cell: (s) => s.dateTime },
  { key: 'topic', header: 'Topic', cell: (s) => s.topic },
  {
    key: 'status',
    header: 'Status',
    cell: (s) =>
      s.status === 'confirmed' ? (
        <Badge tone="green">Confirmed</Badge>
      ) : (
        <Badge tone="amber">Awaiting trainer</Badge>
      ),
  },
];

export default function AdminSessionsPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminSession['status']>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const upcoming = adminSessions.length;
  const awaitingTrainer = adminSessions.filter((s) => s.status === 'awaiting-trainer').length;
  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return adminSessions.filter((session) => {
      const matchesQuery =
        !needle ||
        [session.entrepreneurName, session.trainerName, session.dateTime, session.topic]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [filteredSessions, page, pageSize]);

  return (
    <>
      <PageHeader
        title="Sessions"
        description="All booked mentor/trainer sessions across the platform"
      />
      <Notice>
        Each trainer connects their own Google Calendar or Calendly from their profile
        (Trainers → Edit). Sessions booked by entrepreneurs sync here once a trainer
        accepts them.
      </Notice>
      <MetricGrid columns={3}>
        <StatCard label="Upcoming sessions" value={upcoming} dotColor="bid" />
        <StatCard label="Awaiting trainer confirmation" value={awaitingTrainer} dotColor="warning" />
        <StatCard label="Trainers without calendar linked" value={1} dotColor="info" />
      </MetricGrid>
      <Card className="mt-4">
        <CardHeader
          title="Upcoming & pending sessions"
          description={`${filteredSessions.length} session${filteredSessions.length === 1 ? '' : 's'} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter sessions</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by entrepreneur, trainer, topic, or date.
            </div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[260px_180px]">
            <TableFilterInput
              icon
              placeholder="Search sessions..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            <TableFilterSelect
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as typeof statusFilter);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="awaiting-trainer">Awaiting trainer</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(s) => s.id}
          emptyMessage="No sessions booked."
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredSessions.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>
    </>
  );
}
