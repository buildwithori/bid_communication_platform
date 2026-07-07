'use client';

import * as React from 'react';
import { CalendarDays, Clock3, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
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
import { adminSessions, type AdminSession } from '@/lib/mock-data/admin-workflows';
import { trainerById } from '@/lib/mock-data/trainers';

const currentTrainerId = 't-kofi';
const ALL = 'all';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function timeRange(session: AdminSession) {
  return `${session.startTime}${session.endTime ? `-${session.endTime}` : ''}`;
}

export default function TrainerSessionsPage() {
  const trainer = trainerById(currentTrainerId);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<typeof ALL | AdminSession['status']>(ALL);
  const [typeFilter, setTypeFilter] = React.useState<typeof ALL | AdminSession['sessionType']>(ALL);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const sessions = React.useMemo(
    () => adminSessions.filter((session) => session.trainerId === currentTrainerId || session.trainerName === trainer?.fullName),
    [trainer?.fullName],
  );
  const upcoming = sessions.filter((session) => session.date >= '2026-07-07').length;
  const awaiting = sessions.filter((session) => session.status === 'awaiting-trainer').length;
  const confirmed = sessions.filter((session) => session.status === 'confirmed').length;

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesQuery = !needle || [session.entrepreneurName, session.trainerName, session.topic, session.sessionType, session.date].join(' ').toLowerCase().includes(needle);
      const matchesStatus = statusFilter === ALL || session.status === statusFilter;
      const matchesType = typeFilter === ALL || session.sessionType === typeFilter;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [query, sessions, statusFilter, typeFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, typeFilter, pageSize]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const nextSession = [...sessions].filter((session) => session.date >= '2026-07-07').sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0];

  const columns: Column<AdminSession>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (session) => (
        <RowActions
          actions={[
            session.status === 'awaiting-trainer'
              ? { label: 'Confirm session', onSelect: () => toast.success('Session confirmation will connect to backend.') }
              : { label: 'Add session note', onSelect: () => toast.success('Session notes will connect to backend.') },
            { label: 'Message entrepreneur', onSelect: () => toast.success('Messaging will connect to backend.') },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'session',
      header: 'Session',
      cell: (session) => (
        <div className="min-w-[250px]">
          <div className="font-medium text-ink">{session.topic}</div>
          <div className="mt-1 text-sm text-ink-muted">{session.sessionType} · {session.source === 'entrepreneur-request' ? 'Requested by entrepreneur' : 'Scheduled by BID'}</div>
        </div>
      ),
    },
    { key: 'entrepreneur', header: 'Entrepreneur', cell: (session) => session.entrepreneurName },
    {
      key: 'date',
      header: 'Date / time',
      cell: (session) => (
        <div className="min-w-[170px]">
          <div>{formatDate(session.date)}</div>
          <div className="mt-1 text-sm text-ink-muted">{timeRange(session)}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: () => (
        <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted"><MapPin className="h-4 w-4" />Virtual</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (session) => <Badge tone={session.status === 'confirmed' ? 'green' : 'amber'}>{session.status === 'confirmed' ? 'Confirmed' : 'Awaiting trainer'}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader title="My Sessions" description="Your session requests, confirmed meetings, and follow-up work." />
      <MetricGrid columns={4}>
        <StatCard label="Total sessions" value={sessions.length} subline="In your trainer scope" dotColor="bid" accent="bid" />
        <StatCard label="Upcoming" value={upcoming} subline="From today onward" dotColor="info" accent="info" />
        <StatCard label="Awaiting confirmation" value={awaiting} subline="Needs trainer action" dotColor="warning" accent="warning" />
        <StatCard label="Confirmed" value={confirmed} subline="Ready on calendar" dotColor="success" accent="success" />
      </MetricGrid>

      {nextSession && (
        <Card className="mt-4" accent="info">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-ink-muted">Next session</div>
              <div className="mt-1 text-lg font-semibold text-ink">{nextSession.topic}</div>
              <div className="mt-1 text-sm text-ink-muted">{nextSession.entrepreneurName} · {formatDate(nextSession.date)} · {timeRange(nextSession)}</div>
            </div>
            <Badge tone={nextSession.status === 'confirmed' ? 'green' : 'amber'}>{nextSession.status === 'confirmed' ? 'Confirmed' : 'Awaiting trainer'}</Badge>
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader title="Session list" description={`${filtered.length} session${filtered.length === 1 ? '' : 's'} in this view`} />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter sessions</div>
            <div className="mt-0.5 text-sm text-ink-muted">Search by entrepreneur, topic, type, or date.</div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[280px_180px_180px]">
            <TableFilterInput icon placeholder="Search sessions..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <TableFilterSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value={ALL}>All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="awaiting-trainer">Awaiting trainer</option>
            </TableFilterSelect>
            <TableFilterSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
              <option value={ALL}>All types</option>
              <option value="Mentoring">Mentoring</option>
              <option value="Group session">Group session</option>
              <option value="Investor prep">Investor prep</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable columns={columns} rows={pageRows} rowKey={(session) => session.id} emptyMessage="No sessions match this view." tableClassName="min-w-[980px]" />
        <TablePagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
      </Card>
    </>
  );
}
