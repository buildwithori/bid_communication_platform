'use client';

import { useMemo, useState } from 'react';
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
import { adminSessions, type AdminSession } from '@/lib/mock-data/admin-workflows';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { trainerById } from '@/lib/mock-data/trainers';
import { calendarSupportMessage, supportsMeetingProvider } from '@/lib/sessions/calendar-support';

const currentAdminTeamMember = {
  id: 'admin-ama',
  fullName: 'Ama Darko',
  calendarProvider: 'google' as const,
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeRange(session: AdminSession) {
  return `${session.startTime}${session.endTime ? `-${session.endTime}` : ''}`;
}

function createMeetingUrl(session: AdminSession) {
  return `https://meet.google.com/bid-${session.id.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
}

function sessionStatusMeta(status: AdminSession['status']) {
  if (status === 'confirmed') return { label: 'Confirmed', tone: 'green' as const };
  if (status === 'completed') return { label: 'Completed', tone: 'neutral' as const };
  if (status === 'declined') return { label: 'Declined', tone: 'red' as const };
  return { label: 'Awaiting team member', tone: 'amber' as const };
}

function sessionSourceLabel(source: AdminSession['source']) {
  if (source === 'entrepreneur-request') return 'Requested by entrepreneur';
  if (source === 'trainer-scheduled') return 'Created by trainer';
  return 'Scheduled by BID';
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<AdminSession[]>(adminSessions);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminSession['status']>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | AdminSession['sessionType']>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | AdminSession['source']>('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
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

  const updateSession = (id: string, patch: Partial<AdminSession>, message: string) => {
    setSessions((current) =>
      current.map((session) => (session.id === id ? { ...session, ...patch } : session)),
    );
    toast.success(message);
  };

  const acceptSession = (session: AdminSession) => {
    const assignedTrainer = trainerById(session.trainerId);
    const acceptingCalendarProvider = assignedTrainer?.calendarProvider ?? currentAdminTeamMember.calendarProvider;
    const canAccept = supportsMeetingProvider(acceptingCalendarProvider, session.meetingProvider);

    if (!canAccept) {
      toast.error(calendarSupportMessage(session.meetingProvider));
      return;
    }

    updateSession(
      session.id,
      {
        status: 'confirmed',
        trainerName: assignedTrainer?.fullName ?? currentAdminTeamMember.fullName,
        meetingProvider: session.meetingProvider ?? 'google-meet',
        meetingUrl: session.meetingUrl ?? createMeetingUrl(session),
      },
      assignedTrainer
        ? `Session confirmed for ${assignedTrainer.fullName}`
        : `Team request accepted by ${currentAdminTeamMember.fullName}`,
    );
  };

  const declineSession = () => {
    if (!declineTarget) return;
    updateSession(
      declineTarget.id,
      {
        status: 'declined',
        declineReason: declineReason.trim(),
      },
      'Session request declined',
    );
    setDeclineTarget(null);
    setDeclineReason('');
  };

  const createSession = (values: SessionEditorValues) => {
    const entrepreneur = entrepreneurs.find((item) => item.id === values.entrepreneurId);
    const newSession: AdminSession = {
      id: `s-admin-${Date.now()}`,
      entrepreneurId: values.entrepreneurId,
      trainerId: values.trainerId,
      entrepreneurName: entrepreneur?.representative ?? entrepreneur?.businessName ?? 'Entrepreneur',
      trainerName: values.trainerName,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      meetingProvider: values.meetingProvider,
      meetingUrl: values.meetingUrl,
      sessionType: values.sessionType,
      topic: values.topic,
      status: 'confirmed',
      source: 'admin-scheduled',
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
        trainerId: values.trainerId,
        trainerName: values.trainerName,
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
            requestedBy: 'admin',
            requestedAt: new Date().toISOString().slice(0, 10),
            previousDate: rescheduleTarget.date,
            previousStartTime: rescheduleTarget.startTime,
            previousEndTime: rescheduleTarget.endTime,
            reason: values.reason,
          },
        ],
      },
      'Session rescheduled and attendees notified',
    );
    setRescheduleTarget(null);
  };

  const saveSessionNote = () => {
    if (!noteTarget) return;
    updateSession(
      noteTarget.id,
      { trainerNote: noteText.trim() },
      'Session note saved',
    );
    setNoteTarget(null);
    setNoteText('');
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
  const ownerOptions = useMemo(
    () => [
      { value: 'all', label: 'All owners' },
      ...Array.from(new Set(sessions.map((session) => session.trainerName)))
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
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
      const matchesType = typeFilter === 'all' || session.sessionType === typeFilter;
      const matchesSource = sourceFilter === 'all' || session.source === sourceFilter;
      const matchesOwner = ownerFilter === 'all' || session.trainerName === ownerFilter;
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
                  {
                    label: s.trainerId ? 'Confirm assigned trainer' : 'Accept as me',
                    onSelect: () => acceptSession(s),
                    disabled: !supportsMeetingProvider(
                      trainerById(s.trainerId)?.calendarProvider ?? currentAdminTeamMember.calendarProvider,
                      s.meetingProvider,
                    ),
                  },
                  ...(s.trainerId
                    ? [
                        {
                          label: 'Nudge trainer',
                          onSelect: () => {
                            setNudgeTarget(s);
                            setNudgeMessage(
                              `Please review and accept or decline "${s.topic}" for ${s.entrepreneurName}.`,
                            );
                          },
                        },
                      ]
                    : []),
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
                  {
                    label: 'Mark completed',
                    onSelect: () => updateSession(s.id, { status: 'completed' }, 'Session marked completed'),
                  },
                ]
              : []),
            ...(!['declined', 'completed'].includes(s.status)
              ? [
                  'separator' as const,
                  {
                    label: 'Reschedule session',
                    onSelect: () => setRescheduleTarget(s),
                  },
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
          {s.status === 'awaiting-trainer' &&
            !supportsMeetingProvider(
              trainerById(s.trainerId)?.calendarProvider ?? currentAdminTeamMember.calendarProvider,
              s.meetingProvider,
            ) && (
              <div className="mt-1 text-sm text-warning">Calendar support required</div>
            )}
          {s.status === 'confirmed' && (
            <div className="mt-1 text-sm text-ink-muted">Session owner</div>
          )}
          {s.status === 'completed' && (
            <div className="mt-1 text-sm text-ink-muted">Completed session</div>
          )}
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
            <a
              href={s.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-bid hover:text-bid-dark"
            >
              Meeting link <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {s.rescheduleHistory?.at(-1)?.reason && (
            <div className="mt-2 line-clamp-2 text-xs text-ink-muted">
              Latest reschedule: {s.rescheduleHistory.at(-1)?.reason}
            </div>
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
  ], []);

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
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by entrepreneur, trainer/team, session type, topic, or date.
            </div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[260px_170px_170px_190px_220px]">
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
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </TableFilterSelect>
            <TableFilterSelect
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as typeof typeFilter);
                setPage(1);
              }}
            >
              <option value="all">All types</option>
              <option value="Mentoring">Mentoring</option>
              <option value="Group session">Group session</option>
              <option value="Investor prep">Investor prep</option>
            </TableFilterSelect>
            <TableFilterSelect
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value as typeof sourceFilter);
                setPage(1);
              }}
            >
              <option value="all">All sources</option>
              <option value="entrepreneur-request">Requested by entrepreneur</option>
              <option value="admin-scheduled">Scheduled by BID</option>
              <option value="trainer-scheduled">Created by trainer</option>
            </TableFilterSelect>
            <TableFilterAutocomplete
              value={ownerFilter}
              onValueChange={(value) => {
                setOwnerFilter(value);
                setPage(1);
              }}
              options={ownerOptions}
              placeholder="All owners"
              searchPlaceholder="Search owner..."
              emptyMessage="No owner found."
            />
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
      <MessageModal
        open={!!messageTarget}
        onOpenChange={(open) => !open && setMessageTarget(null)}
        recipientName={messageTarget?.entrepreneurName ?? 'Entrepreneur'}
        recipientDetail={messageTarget ? `${messageTarget.topic} · ${formatDate(messageTarget.date)} · ${formatTimeRange(messageTarget)}` : undefined}
        defaultSubject={messageTarget ? `Session update: ${messageTarget.topic}` : ''}
      />
      <Modal
        open={!!nudgeTarget}
        onOpenChange={(open) => !open && setNudgeTarget(null)}
        title="Nudge trainer"
        width="wide"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            nudgeTrainer();
          }}
        >
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-medium text-ink">{nudgeTarget?.trainerName}</div>
            <div className="mt-1 text-sm text-ink-muted">
              {nudgeTarget?.topic}
              {nudgeTarget ? ` · ${nudgeTarget.entrepreneurName} · ${formatDate(nudgeTarget.date)} · ${formatTimeRange(nudgeTarget)}` : ''}
            </div>
          </div>
          <div className="rounded-lg border border-info/15 bg-info-light/40 px-3 py-2 text-sm text-ink-muted">
            This will notify the trainer in-app and by email when backend messaging is connected.
          </div>
          <FormField label="Message" error={nudgeMessage.trim().length > 0 && nudgeMessage.trim().length < 10 ? 'Add a more useful nudge.' : undefined}>
            <FormTextarea
              rows={4}
              value={nudgeMessage}
              onChange={(event) => setNudgeMessage(event.target.value)}
              placeholder="Tell the trainer what needs attention."
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="outline" onClick={() => setNudgeTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={nudgeMessage.trim().length < 10}>Send nudge</Button>
          </div>
        </form>
      </Modal>
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
            saveSessionNote();
          }}
        >
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-medium text-ink">{noteTarget?.topic}</div>
            <div className="mt-1 text-sm text-ink-muted">
              {noteTarget?.entrepreneurName}
              {noteTarget ? ` · ${formatDate(noteTarget.date)} · ${formatTimeRange(noteTarget)}` : ''}
            </div>
          </div>
          <FormField label="Note" error={noteText.trim().length > 0 && noteText.trim().length < 5 ? 'Add a more useful note.' : undefined}>
            <FormTextarea
              rows={5}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Capture what happened, follow-up needed, or internal context for this session."
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
              {declineTarget?.entrepreneurName} · {declineTarget ? formatDate(declineTarget.date) : ''} · {declineTarget ? formatTimeRange(declineTarget) : ''}
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
        actor="admin"
        onSubmit={createSession}
      />
      <SessionEditorModal
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
        mode="reschedule"
        actor="admin"
        initialSession={rescheduleTarget}
        onSubmit={rescheduleSession}
      />
    </>
  );
}
