'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormTextarea } from '@/components/shared/FormField';
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { MessageModal } from '@/components/shared/MessageModal';
import { SessionEditorModal, type SessionEditorValues } from '@/components/sessions/SessionEditorModal';
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
  type SessionSource,
  type SessionStatus,
  type SessionType,
} from '@/lib/api/sessions';
import { listTrainers, type TrainerRecord } from '@/lib/api/trainers';
import type { AdminSession } from '@/lib/mock-data/admin-workflows';

const ALL = 'all';

type AdminSessionStatusFilter = typeof ALL | SessionStatus;
type AdminSessionTypeFilter = typeof ALL | SessionType;
type AdminSessionSourceFilter = typeof ALL | SessionSource;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
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

function formatTimeRange(session: AdminSession) {
  return `${session.startTime}${session.endTime ? `-${session.endTime}` : ''}`;
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
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
  return { label: 'Awaiting acceptance', tone: 'amber' as const };
}

function sessionSourceLabel(source: AdminSession['source']) {
  if (source === 'entrepreneur-request') return 'Requested by entrepreneur';
  if (source === 'trainer-scheduled') return 'Created by trainer';
  return 'Scheduled by BID';
}

function mutationError(error: unknown) {
  toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
}

export default function AdminSessionsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminSessionStatusFilter>(ALL);
  const [typeFilter, setTypeFilter] = useState<AdminSessionTypeFilter>(ALL);
  const [sourceFilter, setSourceFilter] = useState<AdminSessionSourceFilter>(ALL);
  const [ownerFilter, setOwnerFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [messageTarget, setMessageTarget] = useState<AdminSession | null>(null);
  const [nudgeTarget, setNudgeTarget] = useState<AdminSession | null>(null);
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [declineTarget, setDeclineTarget] = useState<AdminSession | null>(null);
  const [noteTarget, setNoteTarget] = useState<AdminSession | null>(null);
  const [noteText, setNoteText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<AdminSession | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const sessionsQuery = useQuery({
    queryKey: ['sessions', 'admin-list'],
    queryFn: () => listSessions({ take: 100 }),
  });
  const entrepreneursQuery = useQuery({
    queryKey: ['entrepreneurs', 'session-options'],
    queryFn: () => listEntrepreneurs({ take: 100 }),
  });
  const trainersQuery = useQuery({
    queryKey: ['trainers', 'session-options'],
    queryFn: () => listTrainers({ take: 100, status: 'active' }),
  });

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

  const sessions = useMemo<AdminSession[]>(
    () => (sessionsQuery.data?.items ?? []).map(mapSessionRecord),
    [sessionsQuery.data],
  );
  const entrepreneurOptions = useMemo<Array<{ value: string; label: string; description?: string }>>(
    () => (entrepreneursQuery.data?.items ?? []).map((entrepreneur: EntrepreneurRecord) => ({
      value: entrepreneur.entrepreneurUserId,
      label: entrepreneur.businessName,
      description: entrepreneur.representativeName,
    })),
    [entrepreneursQuery.data],
  );
  const trainerOptions = useMemo<Array<{ value: string; label: string; description?: string }>>(
    () => (trainersQuery.data?.items ?? []).map((trainer: TrainerRecord) => ({
      value: trainer.trainerUserId,
      label: trainer.name,
      description: trainer.roleLabel.replace('_', ' '),
    })),
    [trainersQuery.data],
  );

  const createPayload = (values: SessionEditorValues): CreateSessionPayload => ({
    entrepreneurUserId: values.entrepreneurId,
    ownerUserId: values.trainerId,
    type: uiSessionTypeToApi(values.sessionType),
    topic: values.topic,
    startAt: toDateTime(values.date, values.startTime),
    endAt: toDateTime(values.date, values.endTime ?? values.startTime),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    meetingProvider: 'google_meet',
  });

  const createSession = async (values: SessionEditorValues) => {
    await createMutation.mutateAsync(createPayload(values));
  };

  const rescheduleSession = async (values: SessionEditorValues) => {
    if (!rescheduleTarget) return;
    await rescheduleMutation.mutateAsync({
      id: rescheduleTarget.id,
      payload: {
        startAt: toDateTime(values.date, values.startTime),
        endAt: toDateTime(values.date, values.endTime ?? values.startTime),
        reason: values.reason,
      },
    });
  };

  const saveSessionNote = () => {
    if (!noteTarget) return;
    noteMutation.mutate({ id: noteTarget.id, note: noteText.trim() });
  };

  const nudgeTrainer = () => {
    if (!nudgeTarget) return;
    toast.success('Trainer nudge prepared', {
      description: `In-app + email for ${nudgeTarget.trainerName}`,
    });
    setNudgeTarget(null);
    setNudgeMessage('');
  };

  const upcoming = sessions.filter((s) => s.status !== 'declined' && s.status !== 'completed').length;
  const awaitingTrainer = sessions.filter((s) => s.status === 'awaiting-trainer').length;
  const confirmed = sessions.filter((s) => s.status === 'confirmed').length;
  const ownerOptions = useMemo<Array<{ value: string; label: string }>>(
    () => [
      { value: ALL, label: 'All owners' },
      ...Array.from(new Set<string>(sessions.map((session) => session.trainerName)))
        .sort((a, b) => a.localeCompare(b))
        .map((owner) => ({ value: owner, label: owner })),
    ],
    [sessions],
  );
  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesQuery =
        !needle ||
        [session.entrepreneurName, session.trainerName, session.date, session.startTime, session.topic, session.sessionType]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesStatus = statusFilter === ALL || session.status === mapStatus(statusFilter as SessionStatus);
      const matchesType = typeFilter === ALL || session.sessionType === sessionTypeLabel(typeFilter as SessionType);
      const matchesSource = sourceFilter === ALL || session.source === mapSourceFilter(sourceFilter as SessionSource);
      const matchesOwner = ownerFilter === ALL || session.trainerName === ownerFilter;
      return matchesQuery && matchesStatus && matchesType && matchesSource && matchesOwner;
    });
  }, [ownerFilter, query, sessions, sourceFilter, statusFilter, typeFilter]);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [filteredSessions, page, pageSize]);

  const columns = useMemo<Column<AdminSession>[]>(() => [
    {
      key: 'actions',
      header: 'Action',
      cell: (s) => (
        <RowActions
          actions={[
            { label: 'Message entrepreneur', onSelect: () => setMessageTarget(s) },
            ...(s.status === 'awaiting-trainer'
              ? [
                  'separator' as const,
                  { label: 'Accept as me', onSelect: () => acceptMutation.mutate(s.id) },
                  {
                    label: 'Decline request',
                    destructive: true,
                    onSelect: () => {
                      setDeclineTarget(s);
                      setDeclineReason('');
                    },
                  },
                ]
              : []),
            ...(s.status === 'confirmed'
              ? [
                  'separator' as const,
                  ...(s.meetingUrl
                    ? [{ label: 'Open meeting link', onSelect: () => window.open(s.meetingUrl, '_blank', 'noopener,noreferrer') }]
                    : []),
                  ...(s.trainerId
                    ? [
                        {
                          label: 'Nudge trainer',
                          onSelect: () => {
                            setNudgeTarget(s);
                            setNudgeMessage(
                              `Reminder: "${s.topic}" with ${s.entrepreneurName} is scheduled for ${formatDate(s.date)} at ${formatTimeRange(s)}.`,
                            );
                          },
                        },
                      ]
                    : []),
                  { label: 'Mark completed', onSelect: () => completeMutation.mutate(s.id) },
                  { label: 'Reschedule session', onSelect: () => setRescheduleTarget(s) },
                ]
              : []),
            ...(s.status !== 'declined'
              ? [
                  'separator' as const,
                  {
                    label: 'Add session note',
                    onSelect: () => {
                      setNoteTarget(s);
                      setNoteText(s.trainerNote ?? '');
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
      key: 'ent',
      header: 'Entrepreneur',
      cell: (s) => (
        <div>
          <div className="font-medium text-ink">{s.entrepreneurName}</div>
          <div className="mt-1 text-sm text-ink-muted">{sessionSourceLabel(s.source)}</div>
          {s.rescheduleHistory?.length ? (
            <div className="mt-2 text-xs font-medium text-warning">
              Rescheduled {s.rescheduleHistory.length} time{s.rescheduleHistory.length === 1 ? '' : 's'}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'trainer',
      header: 'Trainer / team',
      cell: (s) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-ink">{s.trainerName}</div>
          {!s.trainerId && s.status === 'awaiting-trainer' && (
            <div className="mt-1 text-sm text-ink-muted">Open BID team request</div>
          )}
          {s.status === 'confirmed' && <div className="mt-1 text-sm text-ink-muted">Session owner</div>}
          {s.status === 'completed' && <div className="mt-1 text-sm text-ink-muted">Completed session</div>}
        </div>
      ),
    },
    {
      key: 'dt',
      header: 'Date / time',
      cell: (s) => (
        <div>
          <div>{formatDate(s.date)}</div>
          <div className="text-sm text-ink-muted">{formatTimeRange(s)}</div>
        </div>
      ),
    },
    {
      key: 'topic',
      header: 'Session',
      cell: (s) => (
        <div>
          <div className="font-medium text-ink">{s.topic}</div>
          <div className="mt-1 text-sm text-ink-muted">{s.sessionType}</div>
          {s.status === 'confirmed' && s.meetingUrl && (
            <a href={s.meetingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-bid hover:text-bid-dark">
              Meeting link <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {s.trainerNote && (
            <div className="mt-2 line-clamp-2 rounded-lg bg-surface-subtle px-2.5 py-2 text-xs text-ink-muted">
              Note: {s.trainerNote}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => {
        const meta = sessionStatusMeta(s.status);
        return (
          <div className="min-w-[150px]">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {s.declineReason && <div className="mt-2 text-sm text-ink-muted">{s.declineReason}</div>}
          </div>
        );
      },
    },
  ], [acceptMutation, completeMutation]);

  return (
    <>
      <PageHeader
        title="Sessions"
        description="Track entrepreneur session requests, group sessions, trainer confirmation, and what is already on the calendar"
        actions={<Button onClick={() => setCreateOpen(true)}>+ Create session</Button>}
      />
      <Notice>
        Entrepreneur bookings land here as requests. If the entrepreneur selects any available BID team member, the request remains open until the first trainer or admin accepts it.
      </Notice>
      <MetricGrid columns={3}>
        <StatCard label="Upcoming sessions" value={upcoming} dotColor="bid" />
        <StatCard label="Awaiting acceptance" value={awaitingTrainer} dotColor="warning" />
        <StatCard label="Confirmed" value={confirmed} dotColor="success" />
      </MetricGrid>
      <Card className="mt-4">
        <CardHeader
          title="Upcoming & pending sessions"
          description={`${filteredSessions.length} session${filteredSessions.length === 1 ? '' : 's'} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter sessions</div>
            <div className="mt-0.5 text-sm text-ink-muted">Search by entrepreneur, trainer/team, session type, topic, or date.</div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[260px_170px_170px_190px_220px]">
            <TableFilterInput icon placeholder="Search sessions..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
            <TableFilterSelect value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as AdminSessionStatusFilter); setPage(1); }}>
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="requested">Awaiting acceptance</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </TableFilterSelect>
            <TableFilterSelect value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as AdminSessionTypeFilter); setPage(1); }}>
              <option value="all">All types</option>
              <option value="mentor_checkin">Mentoring</option>
              <option value="office_hours">Group session</option>
              <option value="investor_prep">Investor prep</option>
            </TableFilterSelect>
            <TableFilterSelect value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value as AdminSessionSourceFilter); setPage(1); }}>
              <option value="all">All sources</option>
              <option value="entrepreneur_request">Requested by entrepreneur</option>
              <option value="team_created">Created by BID team</option>
            </TableFilterSelect>
            <TableFilterAutocomplete value={ownerFilter} onValueChange={(value) => { setOwnerFilter(value); setPage(1); }} options={ownerOptions} placeholder="All owners" searchPlaceholder="Search owner..." emptyMessage="No owner found." />
          </div>
        </TableToolbar>
        <DataTable columns={columns} rows={pageRows} rowKey={(s) => s.id} emptyMessage={sessionsQuery.isLoading ? 'Loading sessions...' : 'No sessions booked.'} />
        <TablePagination page={page} pageSize={pageSize} totalItems={filteredSessions.length} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
      </Card>
      <MessageModal
        open={!!messageTarget}
        onOpenChange={(open) => !open && setMessageTarget(null)}
        recipientName={messageTarget?.entrepreneurName ?? 'Entrepreneur'}
        recipientDetail={messageTarget ? `${messageTarget.topic} - ${formatDate(messageTarget.date)} - ${formatTimeRange(messageTarget)}` : undefined}
        defaultSubject={messageTarget ? `Session update: ${messageTarget.topic}` : ''}
      />
      <Modal open={!!nudgeTarget} onOpenChange={(open) => !open && setNudgeTarget(null)} title="Nudge trainer" width="wide">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); nudgeTrainer(); }}>
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-medium text-ink">{nudgeTarget?.trainerName}</div>
            <div className="mt-1 text-sm text-ink-muted">{nudgeTarget?.topic}{nudgeTarget ? ` - ${nudgeTarget.entrepreneurName} - ${formatDate(nudgeTarget.date)} - ${formatTimeRange(nudgeTarget)}` : ''}</div>
          </div>
          <FormField label="Message" error={nudgeMessage.trim().length > 0 && nudgeMessage.trim().length < 10 ? 'Add a more useful nudge.' : undefined}>
            <FormTextarea rows={4} value={nudgeMessage} onChange={(event) => setNudgeMessage(event.target.value)} placeholder="Tell the trainer what needs attention." />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="outline" onClick={() => setNudgeTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={nudgeMessage.trim().length < 10}>Send nudge</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!noteTarget} onOpenChange={(open) => !open && setNoteTarget(null)} title="Add session note" width="wide">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); saveSessionNote(); }}>
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-medium text-ink">{noteTarget?.topic}</div>
            <div className="mt-1 text-sm text-ink-muted">{noteTarget?.entrepreneurName}{noteTarget ? ` - ${formatDate(noteTarget.date)} - ${formatTimeRange(noteTarget)}` : ''}</div>
          </div>
          <FormField label="Note" error={noteText.trim().length > 0 && noteText.trim().length < 5 ? 'Add a more useful note.' : undefined}>
            <FormTextarea rows={5} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Capture what happened, follow-up needed, or internal context for this session." />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="outline" onClick={() => setNoteTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={noteText.trim().length < 5 || noteMutation.isPending}>{noteMutation.isPending ? 'Saving...' : 'Save note'}</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!declineTarget} onOpenChange={(open) => !open && setDeclineTarget(null)} title="Decline session request" width="wide">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (declineTarget) declineMutation.mutate({ id: declineTarget.id, reason: declineReason.trim() }); }}>
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-medium text-ink">{declineTarget?.topic}</div>
            <div className="mt-1 text-sm text-ink-muted">{declineTarget?.entrepreneurName} - {declineTarget ? formatDate(declineTarget.date) : ''} - {declineTarget ? formatTimeRange(declineTarget) : ''}</div>
          </div>
          <FormField label="Reason" error={declineReason.trim().length > 0 && declineReason.trim().length < 5 ? 'Add a short reason.' : undefined}>
            <FormTextarea rows={4} value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} placeholder="Explain why this session cannot be accepted, or suggest what should happen next." />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="outline" onClick={() => setDeclineTarget(null)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={declineReason.trim().length < 5 || declineMutation.isPending}>{declineMutation.isPending ? 'Declining...' : 'Decline request'}</Button>
          </div>
        </form>
      </Modal>
      <SessionEditorModal open={createOpen} onOpenChange={setCreateOpen} mode="create" actor="admin" entrepreneurOptions={entrepreneurOptions} trainerOptions={trainerOptions} isSubmitting={createMutation.isPending} onSubmit={createSession} />
      <SessionEditorModal open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)} mode="reschedule" actor="admin" initialSession={rescheduleTarget} entrepreneurOptions={entrepreneurOptions} trainerOptions={trainerOptions} isSubmitting={rescheduleMutation.isPending} onSubmit={rescheduleSession} />
    </>
  );
}

function mapSourceFilter(source: SessionSource): AdminSession['source'] {
  return source === 'entrepreneur_request' ? 'entrepreneur-request' : 'admin-scheduled';
}
