'use client';

import * as React from 'react';
import { CalendarDays, Clock3, ExternalLink, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { MessageModal } from '@/components/shared/MessageModal';
import { SessionEditorModal, type SessionEditorValues } from '@/components/sessions/SessionEditorModal';
import { FormField, FormTextarea } from '@/components/shared/FormField';
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
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { trainerById } from '@/lib/mock-data/trainers';
import { calendarSupportMessage, supportsMeetingProvider } from '@/lib/sessions/calendar-support';

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

function createMeetingUrl(session: AdminSession) {
  return `https://meet.google.com/bid-${session.id.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
}

function sessionStatusMeta(status: AdminSession['status']) {
  if (status === 'confirmed') return { label: 'Confirmed', tone: 'green' as const };
  if (status === 'completed') return { label: 'Completed', tone: 'neutral' as const };
  if (status === 'declined') return { label: 'Declined', tone: 'red' as const };
  return { label: 'Awaiting trainer', tone: 'amber' as const };
}

export default function TrainerSessionsPage() {
  const trainer = trainerById(currentTrainerId);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<typeof ALL | AdminSession['status']>(ALL);
  const [typeFilter, setTypeFilter] = React.useState<typeof ALL | AdminSession['sessionType']>(ALL);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [sessions, setSessions] = React.useState<AdminSession[]>(() =>
    adminSessions.filter((session) =>
      session.trainerId === currentTrainerId ||
      session.trainerName === trainer?.fullName ||
      (!session.trainerId && session.status === 'awaiting-trainer'),
    ),
  );
  const [messageTarget, setMessageTarget] = React.useState<AdminSession | null>(null);
  const [noteTarget, setNoteTarget] = React.useState<AdminSession | null>(null);
  const [noteText, setNoteText] = React.useState('');
  const [declineTarget, setDeclineTarget] = React.useState<AdminSession | null>(null);
  const [declineReason, setDeclineReason] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [rescheduleTarget, setRescheduleTarget] = React.useState<AdminSession | null>(null);

  const updateSession = (id: string, patch: Partial<AdminSession>, message: string) => {
    setSessions((current) =>
      current.map((session) => (session.id === id ? { ...session, ...patch } : session)),
    );
    toast.success(message);
  };

  const acceptSession = (session: AdminSession) => {
    if (!supportsMeetingProvider(trainer?.calendarProvider, session.meetingProvider)) {
      toast.error(calendarSupportMessage(session.meetingProvider));
      return;
    }

    updateSession(
      session.id,
      {
        status: 'confirmed',
        trainerId: currentTrainerId,
        trainerName: trainer?.fullName ?? session.trainerName,
        meetingProvider: session.meetingProvider ?? 'google-meet',
        meetingUrl: session.meetingUrl ?? createMeetingUrl(session),
      },
      session.trainerId ? 'Session accepted and meeting link created' : 'Team request accepted and assigned to you',
    );
  };

  const declineSession = () => {
    if (!declineTarget) return;
    updateSession(
      declineTarget.id,
      {
        status: 'declined',
        declineReason: declineReason.trim() || 'Trainer declined this request.',
      },
      'Session request declined',
    );
    setDeclineTarget(null);
    setDeclineReason('');
  };

  const createSession = (values: SessionEditorValues) => {
    const entrepreneur = entrepreneurs.find((item) => item.id === values.entrepreneurId);
    const newSession: AdminSession = {
      id: `s-trainer-${values.entrepreneurId}-${values.date}-${values.startTime}`,
      entrepreneurId: values.entrepreneurId,
      trainerId: currentTrainerId,
      entrepreneurName: entrepreneur?.representative ?? entrepreneur?.businessName ?? 'Entrepreneur',
      trainerName: trainer?.fullName ?? values.trainerName,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      meetingProvider: values.meetingProvider,
      meetingUrl: values.meetingUrl,
      sessionType: values.sessionType,
      topic: values.topic,
      status: 'confirmed',
      source: 'trainer-scheduled',
    };
    setSessions((current) => [newSession, ...current]);
    setCreateOpen(false);
    toast.success('Session created and meeting link added');
  };

  const rescheduleSession = (values: SessionEditorValues) => {
    if (!rescheduleTarget) return;
    updateSession(
      rescheduleTarget.id,
      {
        entrepreneurId: values.entrepreneurId,
        trainerId: currentTrainerId,
        trainerName: trainer?.fullName ?? values.trainerName,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        meetingProvider: values.meetingProvider,
        meetingUrl: values.meetingUrl,
        sessionType: values.sessionType,
        topic: values.topic,
        status: rescheduleTarget.status === 'awaiting-trainer' ? 'awaiting-trainer' : 'confirmed',
        rescheduleHistory: [
          ...(rescheduleTarget.rescheduleHistory ?? []),
          {
            requestedBy: 'trainer',
            requestedAt: new Date().toISOString().slice(0, 10),
            previousDate: rescheduleTarget.date,
            previousStartTime: rescheduleTarget.startTime,
            previousEndTime: rescheduleTarget.endTime,
            reason: values.reason,
          },
        ],
      },
      'Session rescheduled and entrepreneur notified',
    );
    setRescheduleTarget(null);
  };

  const upcoming = sessions.filter((session) => session.date >= '2026-07-07' && !['declined', 'completed'].includes(session.status)).length;
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
  const nextSession = [...sessions]
    .filter((session) => session.date >= '2026-07-07' && !['declined', 'completed'].includes(session.status))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0];

  const columns: Column<AdminSession>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (session) => (
        <RowActions
          actions={[
            { label: 'Message entrepreneur', onSelect: () => setMessageTarget(session) },
            ...(session.status === 'awaiting-trainer'
              ? [
                  'separator' as const,
                  {
                    label: 'Accept session',
                    onSelect: () => acceptSession(session),
                    disabled: !supportsMeetingProvider(trainer?.calendarProvider, session.meetingProvider),
                  },
                  {
                    label: 'Decline request',
                    destructive: true,
                    onSelect: () => {
                      setDeclineTarget(session);
                      setDeclineReason('');
                    },
                  },
                ]
              : []),
            ...(session.status === 'confirmed'
              ? [
                  'separator' as const,
                  ...(session.meetingUrl
                    ? [{ label: 'Open meeting link', onSelect: () => window.open(session.meetingUrl, '_blank', 'noopener,noreferrer') }]
                    : []),
                  {
                    label: 'Mark completed',
                    onSelect: () => updateSession(session.id, { status: 'completed' }, 'Session marked completed'),
                  },
                ]
              : []),
            ...(!['declined', 'completed'].includes(session.status)
              ? [
                  'separator' as const,
                  {
                    label: 'Reschedule session',
                    onSelect: () => setRescheduleTarget(session),
                  },
                ]
              : []),
            ...(session.status !== 'declined'
              ? [
                  'separator' as const,
                  {
                    label: 'Add session note',
                    onSelect: () => {
                      setNoteTarget(session);
                      setNoteText(session.trainerNote ?? '');
                    },
                  },
                ]
              : []),
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
          <div className="mt-1 text-sm text-ink-muted">
            {session.sessionType} · {!session.trainerId && session.status === 'awaiting-trainer'
              ? 'Open BID team request'
              : session.source === 'entrepreneur-request'
                ? 'Requested by entrepreneur'
                : session.source === 'trainer-scheduled'
                  ? 'Created by trainer'
                  : 'Scheduled by BID'}
          </div>
          {session.rescheduleHistory?.length ? (
            <div className="mt-2 text-xs font-medium text-warning">
              Rescheduled {session.rescheduleHistory.length} time{session.rescheduleHistory.length === 1 ? '' : 's'}
            </div>
          ) : null}
          {session.status === 'awaiting-trainer' &&
            !supportsMeetingProvider(trainer?.calendarProvider, session.meetingProvider) && (
              <div className="mt-2 text-xs font-medium text-warning">Connect a supported calendar to accept</div>
            )}
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
      cell: (session) => (
        <div className="flex min-w-[180px] flex-col items-start gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
            <MapPin className="h-4 w-4" />
            Virtual
          </span>
          {session.status === 'confirmed' && session.meetingUrl && (
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-bid/20 bg-bid-light px-2.5 text-xs font-medium text-bid-dark transition hover:border-bid/35 hover:bg-bid/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
            >
              Join meeting <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {session.status === 'confirmed' && !session.meetingUrl && (
            <span className="text-xs text-ink-muted">Meeting link pending</span>
          )}
          {session.rescheduleHistory?.at(-1)?.reason && (
            <span className="max-w-[180px] text-xs text-ink-muted">
              Latest reschedule: {session.rescheduleHistory.at(-1)?.reason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (session) => {
        const meta = sessionStatusMeta(session.status);
        return (
          <div className="min-w-[150px]">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {session.declineReason && <div className="mt-2 text-sm text-ink-muted">{session.declineReason}</div>}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="My Sessions"
        description="Your session requests, confirmed meetings, and follow-up work."
        actions={<Button onClick={() => setCreateOpen(true)}>+ Create session</Button>}
      />
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
            <div className="flex flex-wrap items-center gap-2">
              {nextSession.status === 'awaiting-trainer' && (
                <>
                  <Button
                    size="sm"
                    disabled={!supportsMeetingProvider(trainer?.calendarProvider, nextSession.meetingProvider)}
                    onClick={() => acceptSession(nextSession)}
                  >
                    Accept
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeclineTarget(nextSession)}>Decline</Button>
                </>
              )}
              {nextSession.status === 'confirmed' && nextSession.meetingUrl && (
                <Button size="sm" asChild>
                  <a href={nextSession.meetingUrl} target="_blank" rel="noreferrer">Join meeting</a>
                </Button>
              )}
              <Badge tone={sessionStatusMeta(nextSession.status).tone}>{sessionStatusMeta(nextSession.status).label}</Badge>
            </div>
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
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
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

      <MessageModal
        open={!!messageTarget}
        onOpenChange={(open) => !open && setMessageTarget(null)}
        recipientName={messageTarget?.entrepreneurName ?? 'Entrepreneur'}
        recipientDetail={messageTarget ? `${messageTarget.topic} · ${formatDate(messageTarget.date)} · ${timeRange(messageTarget)}` : undefined}
        defaultSubject={messageTarget ? `Follow-up on ${messageTarget.topic}` : ''}
      />

      <Modal
        open={!!noteTarget}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        title="Add session note"
        width="wide"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (noteTarget) {
              updateSession(noteTarget.id, { trainerNote: noteText.trim() }, 'Session note saved');
            }
            setNoteTarget(null);
            setNoteText('');
          }}
        >
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-medium text-ink">{noteTarget?.topic}</div>
            <div className="mt-1 text-sm text-ink-muted">{noteTarget?.entrepreneurName}</div>
          </div>
          <FormField label="Note" error={noteText.trim().length > 0 && noteText.trim().length < 5 ? 'Add a more useful note.' : undefined}>
            <FormTextarea
              rows={5}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Capture what happened, next steps, or preparation needed..."
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="outline" onClick={() => setNoteTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={noteText.trim().length < 5}>Save note</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!declineTarget}
        onOpenChange={(open) => !open && setDeclineTarget(null)}
        title="Decline session request"
        width="wide"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            declineSession();
          }}
        >
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-medium text-ink">{declineTarget?.topic}</div>
            <div className="mt-1 text-sm text-ink-muted">
              {declineTarget?.entrepreneurName} · {declineTarget ? formatDate(declineTarget.date) : ''} · {declineTarget ? timeRange(declineTarget) : ''}
            </div>
          </div>
          <FormField label="Reason" error={declineReason.trim().length > 0 && declineReason.trim().length < 5 ? 'Add a short reason.' : undefined}>
            <FormTextarea
              rows={4}
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
              placeholder="Explain why this session cannot be accepted, or suggest what should happen next."
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="outline" onClick={() => setDeclineTarget(null)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={declineReason.trim().length < 5}>Decline request</Button>
          </div>
        </form>
      </Modal>

      <SessionEditorModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        actor="trainer"
        defaultTrainerId={currentTrainerId}
        defaultTrainerName={trainer?.fullName}
        onSubmit={createSession}
      />
      <SessionEditorModal
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
        mode="reschedule"
        actor="trainer"
        initialSession={rescheduleTarget}
        defaultTrainerId={currentTrainerId}
        defaultTrainerName={trainer?.fullName}
        onSubmit={rescheduleSession}
      />
    </>
  );
}
