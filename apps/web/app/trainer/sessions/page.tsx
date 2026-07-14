'use client';

import * as React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { getCurrentUser } from '@/lib/api/auth';
import { listEntrepreneurs, type EntrepreneurRecord } from '@/lib/api/entrepreneurs';
import {
  acceptSession as acceptSessionRecord,
  addSessionNote,
  completeSession as completeSessionRecord,
  createSession as createSessionRecord,
  declineSession as declineSessionRecord,
  listSessions,
  rescheduleSession as rescheduleSessionRecord,
  type CreateSessionPayload,
  type SessionRecord,
  type SessionStatus,
  type SessionType,
} from '@/lib/api/sessions';
import type { AdminSession } from '@/lib/mock-data/admin-workflows';

const ALL = 'all';

type TrainerSessionStatusFilter = typeof ALL | AdminSession['status'];
type TrainerSessionTypeFilter = typeof ALL | SessionType;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function timeRange(session: AdminSession) {
  return `${session.startTime}${session.endTime ? `-${session.endTime}` : ''}`;
}

function sessionTypeLabel(type: SessionType): AdminSession['sessionType'] {
  const labels: Record<SessionType, AdminSession['sessionType']> = {
    mentor_checkin: 'Mentoring',
    office_hours: 'Group session',
    investor_prep: 'Investor prep',
  };
  return labels[type];
}

function uiSessionTypeToApi(value: AdminSession['sessionType']): SessionType {
  if (value === 'Group session') return 'office_hours';
  if (value === 'Investor prep') return 'investor_prep';
  return 'mentor_checkin';
}

function mapStatus(status: SessionStatus): AdminSession['status'] {
  if (status === 'requested') return 'awaiting-trainer';
  if (status === 'cancelled') return 'declined';
  return status;
}

function mapSource(session: SessionRecord): AdminSession['source'] {
  if (session.source === 'entrepreneur_request') return 'entrepreneur-request';
  return session.createdBy.role === 'trainer' ? 'trainer-scheduled' : 'admin-scheduled';
}

function mapSessionRecord(session: SessionRecord): AdminSession {
  const lastInternalNote = session.notesHistory.find((note) => note.visibility === 'internal');

  return {
    id: session.id,
    entrepreneurId: session.entrepreneurUserId,
    trainerId: session.ownerUserId ?? undefined,
    entrepreneurName: session.entrepreneur.businessName || session.entrepreneur.name,
    trainerName: session.owner?.name ?? 'Any available BID team member',
    date: toDateInput(session.startAt),
    startTime: formatTime(session.startAt),
    endTime: formatTime(session.endAt),
    meetingProvider: 'google-meet',
    meetingUrl: session.meetingUrl ?? undefined,
    sessionType: sessionTypeLabel(session.type),
    topic: session.topic,
    status: mapStatus(session.status),
    source: mapSource(session),
    declineReason: session.declinedReason ?? session.cancelledReason ?? undefined,
    trainerNote: lastInternalNote?.note,
    rescheduleHistory: session.notesHistory
      .filter((note) => note.note.startsWith('Rescheduled:'))
      .map((note) => ({
        requestedBy: note.author.role === 'trainer' ? 'trainer' : 'admin',
        requestedAt: toDateInput(note.createdAt),
        previousDate: toDateInput(session.startAt),
        previousStartTime: formatTime(session.startAt),
        previousEndTime: formatTime(session.endAt),
        reason: note.note.replace(/^Rescheduled:\s*/, ''),
      })),
  };
}

function sessionStatusMeta(status: AdminSession['status']) {
  if (status === 'confirmed') return { label: 'Confirmed', tone: 'green' as const };
  if (status === 'completed') return { label: 'Completed', tone: 'neutral' as const };
  if (status === 'declined') return { label: 'Declined', tone: 'red' as const };
  return { label: 'Awaiting trainer', tone: 'amber' as const };
}

function sessionSourceLabel(session: AdminSession) {
  if (!session.trainerId && session.status === 'awaiting-trainer') return 'Open BID team request';
  if (session.source === 'entrepreneur-request') return 'Requested by entrepreneur';
  if (session.source === 'trainer-scheduled') return 'Created by trainer';
  return 'Scheduled by BID';
}

function mutationError(error: unknown) {
  toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
}

export default function TrainerSessionsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TrainerSessionStatusFilter>(ALL);
  const [typeFilter, setTypeFilter] = React.useState<TrainerSessionTypeFilter>(ALL);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [messageTarget, setMessageTarget] = React.useState<AdminSession | null>(null);
  const [noteTarget, setNoteTarget] = React.useState<AdminSession | null>(null);
  const [noteText, setNoteText] = React.useState('');
  const [declineTarget, setDeclineTarget] = React.useState<AdminSession | null>(null);
  const [declineReason, setDeclineReason] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [rescheduleTarget, setRescheduleTarget] = React.useState<AdminSession | null>(null);

  const userQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
  });
  const sessionsQuery = useQuery({
    queryKey: ['sessions', 'trainer-list'],
    queryFn: () => listSessions({ take: 100 }),
  });
  const entrepreneursQuery = useQuery({
    queryKey: ['entrepreneurs', 'trainer-session-options'],
    queryFn: () => listEntrepreneurs({ take: 100 }),
  });

  const currentUser = userQuery.data?.user ?? null;
  const currentTrainerName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.email || 'Trainer';

  const invalidateSessions = () => {
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const acceptMutation = useMutation({
    mutationFn: acceptSessionRecord,
    onSuccess: () => {
      invalidateSessions();
      toast.success('Session accepted and meeting link created');
    },
    onError: mutationError,
  });
  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => declineSessionRecord(id, { reason }),
    onSuccess: () => {
      invalidateSessions();
      toast.success('Session request declined');
      setDeclineTarget(null);
      setDeclineReason('');
    },
    onError: mutationError,
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => completeSessionRecord(id, {}),
    onSuccess: () => {
      invalidateSessions();
      toast.success('Session marked completed');
    },
    onError: mutationError,
  });
  const noteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => addSessionNote(id, { note, visibility: 'internal' }),
    onSuccess: () => {
      invalidateSessions();
      toast.success('Session note saved');
      setNoteTarget(null);
      setNoteText('');
    },
    onError: mutationError,
  });
  const createMutation = useMutation({
    mutationFn: createSessionRecord,
    onSuccess: () => {
      invalidateSessions();
      toast.success('Session created and meeting link added');
      setCreateOpen(false);
    },
    onError: mutationError,
  });
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { startAt: string; endAt: string; reason?: string } }) =>
      rescheduleSessionRecord(id, payload),
    onSuccess: () => {
      invalidateSessions();
      toast.success('Session rescheduled and attendees notified');
      setRescheduleTarget(null);
    },
    onError: mutationError,
  });

  const sessions = React.useMemo<AdminSession[]>(
    () => (sessionsQuery.data?.items ?? []).map(mapSessionRecord),
    [sessionsQuery.data],
  );
  const entrepreneurOptions = React.useMemo<Array<{ value: string; label: string; description?: string }>>(
    () => (entrepreneursQuery.data?.items ?? []).map((entrepreneur: EntrepreneurRecord) => ({
      value: entrepreneur.entrepreneurUserId,
      label: entrepreneur.businessName,
      description: entrepreneur.representativeName,
    })),
    [entrepreneursQuery.data],
  );
  const trainerOptions = React.useMemo<Array<{ value: string; label: string; description?: string }>>(
    () => currentUser ? [{ value: currentUser.id, label: currentTrainerName, description: currentUser.email }] : [],
    [currentTrainerName, currentUser],
  );

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesQuery =
        !needle ||
        [session.entrepreneurName, session.trainerName, session.topic, session.sessionType, session.date]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesStatus = statusFilter === ALL || session.status === statusFilter;
      const matchesType = typeFilter === ALL || uiSessionTypeToApi(session.sessionType) === typeFilter;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [query, sessions, statusFilter, typeFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, typeFilter, pageSize]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const now = Date.now();
  const upcomingSessions = sessions.filter((session) => {
    const startTime = new Date(`${session.date}T${session.startTime}:00`).getTime();
    return startTime >= now && !['declined', 'completed'].includes(session.status);
  });
  const upcoming = upcomingSessions.length;
  const awaiting = sessions.filter((session) => session.status === 'awaiting-trainer').length;
  const confirmed = sessions.filter((session) => session.status === 'confirmed').length;
  const nextSession = [...upcomingSessions].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0];

  const createSession = async (values: SessionEditorValues) => {
    const endTime = values.endTime ?? values.startTime;
    const payload: CreateSessionPayload = {
      entrepreneurUserId: values.entrepreneurId,
      ownerUserId: currentUser?.id,
      type: uiSessionTypeToApi(values.sessionType),
      topic: values.topic,
      startAt: toDateTime(values.date, values.startTime),
      endAt: toDateTime(values.date, endTime),
      timezone: 'UTC',
      meetingProvider: 'google_meet',
    };
    await createMutation.mutateAsync(payload);
  };

  const rescheduleSession = async (values: SessionEditorValues) => {
    if (!rescheduleTarget) return;
    const endTime = values.endTime ?? values.startTime;
    await rescheduleMutation.mutateAsync({
      id: rescheduleTarget.id,
      payload: {
        startAt: toDateTime(values.date, values.startTime),
        endAt: toDateTime(values.date, endTime),
        reason: values.reason,
      },
    });
  };

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
                    onSelect: () => acceptMutation.mutate(session.id),
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
                    onSelect: () => completeMutation.mutate(session.id),
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
        <div className="min-w-[260px]">
          <div className="font-medium text-ink">{session.topic}</div>
          <div className="mt-1 text-sm text-ink-muted">
            {session.sessionType} · {sessionSourceLabel(session)}
          </div>
          {session.rescheduleHistory?.length ? (
            <div className="mt-2 text-xs font-medium text-warning">
              Rescheduled {session.rescheduleHistory.length} time{session.rescheduleHistory.length === 1 ? '' : 's'}
            </div>
          ) : null}
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
        <div className="flex min-w-[190px] flex-col items-start gap-2">
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
            <span className="max-w-[190px] text-xs text-ink-muted">
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
              <div className="mt-1 text-sm text-ink-muted">
                {nextSession.entrepreneurName} · {formatDate(nextSession.date)} · {timeRange(nextSession)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {nextSession.status === 'awaiting-trainer' && (
                <>
                  <Button size="sm" onClick={() => acceptMutation.mutate(nextSession.id)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeclineTarget(nextSession)}>
                    Decline
                  </Button>
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
            <TableFilterSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TrainerSessionStatusFilter)}>
              <option value={ALL}>All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="awaiting-trainer">Awaiting trainer</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </TableFilterSelect>
            <TableFilterSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TrainerSessionTypeFilter)}>
              <option value={ALL}>All types</option>
              <option value="mentor_checkin">Mentoring</option>
              <option value="office_hours">Group session</option>
              <option value="investor_prep">Investor prep</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(session) => session.id}
          emptyMessage={sessionsQuery.isLoading ? 'Loading sessions...' : 'No sessions match this view.'}
          tableClassName="min-w-[980px]"
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
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
              noteMutation.mutate({ id: noteTarget.id, note: noteText.trim() });
            }
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
            <Button type="submit" disabled={noteText.trim().length < 5 || noteMutation.isPending}>
              {noteMutation.isPending ? 'Saving...' : 'Save note'}
            </Button>
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
            if (declineTarget) {
              declineMutation.mutate({ id: declineTarget.id, reason: declineReason.trim() });
            }
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
            <Button type="submit" variant="destructive" disabled={declineReason.trim().length < 5 || declineMutation.isPending}>
              {declineMutation.isPending ? 'Declining...' : 'Decline request'}
            </Button>
          </div>
        </form>
      </Modal>

      <SessionEditorModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        actor="trainer"
        defaultTrainerId={currentUser?.id}
        defaultTrainerName={currentTrainerName}
        entrepreneurOptions={entrepreneurOptions}
        trainerOptions={trainerOptions}
        isSubmitting={createMutation.isPending}
        onSubmit={createSession}
      />
      <SessionEditorModal
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
        mode="reschedule"
        actor="trainer"
        initialSession={rescheduleTarget}
        defaultTrainerId={currentUser?.id}
        defaultTrainerName={currentTrainerName}
        entrepreneurOptions={entrepreneurOptions}
        trainerOptions={trainerOptions}
        isSubmitting={rescheduleMutation.isPending}
        onSubmit={rescheduleSession}
      />
    </>
  );
}
