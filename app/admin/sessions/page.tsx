'use client';

import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { toast } from 'sonner';

interface AdminSession {
  id: string;
  entrepreneurName: string;
  trainerName: string;
  dateTime: string;
  topic: string;
  status: 'confirmed' | 'awaiting-trainer';
}

const seedSessions: AdminSession[] = [
  { id: 's1', entrepreneurName: 'Amara Osei', trainerName: 'Kofi Mensah', dateTime: 'Apr 22, 2:00 PM', topic: 'Fundraising strategy', status: 'confirmed' },
  { id: 's2', entrepreneurName: 'Tunde Kola', trainerName: 'Esi Adu', dateTime: 'Apr 23, 10:00 AM', topic: 'Ops & supply chain', status: 'confirmed' },
  { id: 's3', entrepreneurName: 'Nadia Asante', trainerName: 'Mabel Osei', dateTime: 'Apr 24, 1:30 PM', topic: 'Legal structure review', status: 'awaiting-trainer' },
  { id: 's4', entrepreneurName: 'Grace Nana', trainerName: 'Kofi Mensah', dateTime: 'Apr 25, 9:00 AM', topic: 'Investor pitch prep', status: 'awaiting-trainer' },
  { id: 's5', entrepreneurName: 'Kwame Mensah', trainerName: 'Esi Adu', dateTime: 'Apr 28, 11:00 AM', topic: 'Agritech market sizing', status: 'confirmed' },
];

const columns: Column<AdminSession>[] = [
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
  {
    key: 'actions',
    header: '',
    cell: (s) =>
      s.status === 'confirmed' ? (
        <Button variant="outline" size="sm" onClick={() => toast.success('Reminder sent!')}>
          Send reminder
        </Button>
      ) : (
        <Button size="sm" onClick={() => toast.success('Trainer notified to confirm')}>
          Nudge trainer
        </Button>
      ),
  },
];

export default function AdminSessionsPage() {
  const upcoming = seedSessions.length;
  const awaitingTrainer = seedSessions.filter((s) => s.status === 'awaiting-trainer').length;

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
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        <StatCard label="Upcoming sessions" value={upcoming} dotColor="bid" />
        <StatCard label="Awaiting trainer confirmation" value={awaitingTrainer} dotColor="warning" />
        <StatCard label="Trainers without calendar linked" value={1} dotColor="info" />
      </div>
      <Card className="mt-3">
        <CardHeader title="Upcoming & pending sessions" />
        <DataTable
          columns={columns}
          rows={seedSessions}
          rowKey={(s) => s.id}
          emptyMessage="No sessions booked."
        />
      </Card>
    </>
  );
}
