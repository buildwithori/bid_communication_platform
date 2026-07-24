"use client";

import { useDebouncedValue } from '@/lib/search';
import * as React from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Notice } from "@/components/shared/PageHeader";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardHeader, Skeleton, TableSkeleton } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { MessageModal } from "@/components/shared/MessageModal";
import { LinkedSessionDetailModal } from "@/components/sessions/LinkedSessionDetailModal";
import {
  SessionEditorModal,
  type SessionEditorValues,
} from "@/components/sessions/SessionEditorModal";
import { FormField, FormTextarea } from "@/components/shared/FormField";
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import { useCurrentUserQuery } from "@/lib/api/auth";
import {
  useAcceptSessionMutation,
  useAddSessionNoteMutation,
  useCancelSessionMutation,
  useCompleteSessionMutation,
  useCreateSessionMutation,
  useDeclineSessionMutation,
  useRescheduleSessionMutation,
  useSessionSummaryQuery,
  useSessionsPage,
  useSendSessionMessageMutation,
  type SessionRecord,
  type SessionStatus,
  type SessionType,
} from "@/lib/api/sessions";
import { useLazySessionTypesQuery } from "@/lib/api/settings";
import { PLATFORM_DEFAULT_TIMEZONE } from "@/lib/timezones";

const ALL = "all";

function formatDateTime(value: string, timezone: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  });
}

function statusMeta(status: SessionStatus) {
  if (status === "confirmed")
    return { label: "Confirmed", tone: "green" as const };
  if (status === "completed")
    return { label: "Completed", tone: "neutral" as const };
  if (status === "declined") return { label: "Declined", tone: "red" as const };
  if (status === "cancelled")
    return { label: "Cancelled", tone: "red" as const };
  return { label: "Awaiting team", tone: "amber" as const };
}

export function SessionManagementPage({
  actor,
}: {
  actor: "admin" | "trainer";
}) {
  const currentUser = useCurrentUserQuery();
  const viewerTimezone =
    currentUser.data?.user?.timezone ?? PLATFORM_DEFAULT_TIMEZONE;
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = React.useState<typeof ALL | SessionStatus>(ALL);
  const [type, setType] = React.useState<typeof ALL | SessionType>(ALL);
  const [typeSearch, setTypeSearch] = React.useState("");
  const sessionTypes = useLazySessionTypesQuery({
    enabled: true,
    search: typeSearch || undefined,
    take: 20,
  });
  const sessionTypeOptions = [
    { value: ALL, label: "All types" },
    ...(sessionTypes.data?.pages ?? [])
      .flatMap((page) => page.items)
      .map((entry) => ({ value: entry.key, label: entry.name })),
  ];
  const [pageSize, setPageSize] = React.useState(10);
  const sessions = useSessionsPage({
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
    type: type === ALL ? undefined : type,
    take: pageSize,
  });
  const sessionSummary = useSessionSummaryQuery();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [rescheduleTarget, setRescheduleTarget] =
    React.useState<SessionRecord | null>(null);
  const [declineTarget, setDeclineTarget] =
    React.useState<SessionRecord | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<SessionRecord | null>(
    null,
  );
  const [completeTarget, setCompleteTarget] =
    React.useState<SessionRecord | null>(null);
  const [noteTarget, setNoteTarget] = React.useState<SessionRecord | null>(
    null,
  );
  const [messageTarget, setMessageTarget] =
    React.useState<SessionRecord | null>(null);
  const [reason, setReason] = React.useState("");
  const [note, setNote] = React.useState("");
  const sendMessage = useSendSessionMessageMutation({
    onError: (error) => toast.error(error.message),
  });

  const { resetPagination } = sessions;
  React.useEffect(() => {
    resetPagination();
  }, [debouncedSearch, pageSize, resetPagination, status, type]);

  const mutationHandlers = (message: string, close: () => void) => ({
    onSuccess: () => {
      toast.success(message);
      close();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const createSession = useCreateSessionMutation(
    mutationHandlers("Session created with Google Meet", () =>
      setCreateOpen(false),
    ),
  );
  const acceptSession = useAcceptSessionMutation({
    onSuccess: () => toast.success("Session accepted and added to Calendar"),
    onError: (error) => toast.error(error.message),
  });
  const declineSession = useDeclineSessionMutation(
    mutationHandlers(
      declineTarget?.targetType === "open_team"
        ? "You are no longer in this open request queue"
        : "Session request declined",
      () => {
        setDeclineTarget(null);
        setReason("");
      },
    ),
  );
  const cancelSession = useCancelSessionMutation(
    mutationHandlers("Session cancelled and Calendar updated", () => {
      setCancelTarget(null);
      setReason("");
    }),
  );
  const completeSession = useCompleteSessionMutation(
    mutationHandlers("Session marked completed", () => {
      setCompleteTarget(null);
      setNote("");
    }),
  );
  const addNote = useAddSessionNoteMutation(
    mutationHandlers("Session note saved", () => {
      setNoteTarget(null);
      setNote("");
    }),
  );
  const rescheduleSession = useRescheduleSessionMutation(
    mutationHandlers("Session and Google Calendar event rescheduled", () =>
      setRescheduleTarget(null),
    ),
  );

  const canHandleRequest = React.useCallback(
    (session: SessionRecord) =>
      session.status === "requested" &&
      !session.declinedByCurrentUser &&
      (session.targetType === "open_team" ||
        session.targetUserId === currentUser.data?.user?.id),
    [currentUser.data?.user?.id],
  );

  const columns = React.useMemo<Column<SessionRecord>[]>(
    () => [
      {
        key: "actions",
        header: "Action",
        className: "w-[150px]",
        cell: (session) => (
          <div className="flex items-center gap-2">
            {canHandleRequest(session) ? (
              <Button
                size="sm"
                onClick={() => acceptSession.mutate(session.id)}
                isLoading={
                  acceptSession.isPending &&
                  acceptSession.variables === session.id
                }
                loadingLabel="Accepting"
              >
                Accept
              </Button>
            ) : null}
            <RowActions
              actions={[
                {
                  label: "Message entrepreneur",
                  onSelect: () => setMessageTarget(session),
                },
                ...(canHandleRequest(session)
                  ? [
                      "separator" as const,
                      {
                        label:
                          session.targetType === "open_team"
                            ? "Leave this request"
                            : "Decline request",
                        destructive: true,
                        onSelect: () => {
                          setDeclineTarget(session);
                          setReason("");
                        },
                      },
                    ]
                  : []),
                ...(session.status === "confirmed"
                  ? [
                      "separator" as const,
                      ...(session.meetingUrl
                        ? [
                            {
                              label: "Open meeting link",
                              onSelect: () =>
                                window.open(
                                  session.meetingUrl as string,
                                  "_blank",
                                  "noopener,noreferrer",
                                ),
                            },
                          ]
                        : []),
                      {
                        label: "Reschedule session",
                        onSelect: () => setRescheduleTarget(session),
                      },
                      {
                        label: "Mark completed",
                        onSelect: () => {
                          setCompleteTarget(session);
                          setNote("");
                        },
                      },
                      {
                        label: "Cancel session",
                        destructive: true,
                        onSelect: () => {
                          setCancelTarget(session);
                          setReason("");
                        },
                      },
                    ]
                  : []),
                ...(["confirmed", "completed"].includes(session.status)
                  ? [
                      "separator" as const,
                      {
                        label: "Add session note",
                        onSelect: () => {
                          setNoteTarget(session);
                          setNote("");
                        },
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        ),
      },
      {
        key: "session",
        header: "Session",
        cell: (session) => (
          <div className="min-w-[250px]">
            <div className="font-medium text-ink">{session.topic}</div>
            <div className="mt-1 text-sm text-ink-muted">
              {session.typeName} ·{" "}
              {session.source === "entrepreneur_request"
                ? "Requested by entrepreneur"
                : "Created by BID team"}
            </div>
            {session.reschedules.length ? (
              <div className="mt-2 text-xs font-medium text-warning">
                Rescheduled {session.reschedules.length} time
                {session.reschedules.length === 1 ? "" : "s"}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "entrepreneur",
        header: "Entrepreneur",
        cell: (session) => (
          <div className="min-w-[180px]">
            <div className="font-medium text-ink">
              {session.entrepreneur.businessName}
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              {session.entrepreneur.name}
            </div>
          </div>
        ),
      },
      {
        key: "owner",
        header: "Trainer / team",
        cell: (session) => (
          <div className="min-w-[170px]">
            <div className="font-medium text-ink">
              {session.owner?.name ??
                session.target?.name ??
                "Any available BID team member"}
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              {session.owner
                ? "Calendar owner"
                : session.targetType === "specific_user"
                  ? "Targeted request"
                  : "Open team request"}
            </div>
          </div>
        ),
      },
      {
        key: "time",
        header: "Date / time",
        cell: (session) => (
          <div className="min-w-[190px]">
            <div>{formatDateTime(session.startAt, viewerTimezone)}</div>
            <div className="mt-1 text-sm text-ink-muted">
              Ends{" "}
              {new Date(session.endAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: viewerTimezone,
              })}{" "}
              · {viewerTimezone}
            </div>
          </div>
        ),
      },
      {
        key: "meeting",
        header: "Meeting",
        cell: (session) =>
          session.status === "confirmed" && session.meetingUrl ? (
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-bid/20 bg-bid-light px-2.5 py-2 text-xs font-medium text-bid-dark"
            >
              Google Meet <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="text-sm text-ink-muted">
              {session.status === "requested"
                ? "Created after acceptance"
                : "Not available"}
            </span>
          ),
      },
      {
        key: "status",
        header: "Status",
        cell: (session) => {
          const meta = statusMeta(session.status);
          return (
            <div className="min-w-[140px]">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {session.declinedByCurrentUser ? (
                <div className="mt-2 text-xs text-ink-muted">
                  You left this request
                </div>
              ) : null}
              {session.declinedReason || session.cancelledReason ? (
                <div className="mt-2 text-xs text-ink-muted">
                  {session.declinedReason ?? session.cancelledReason}
                </div>
              ) : null}
            </div>
          );
        },
      },
    ],
    [acceptSession, canHandleRequest, viewerTimezone],
  );

  if (
    sessions.isLoading ||
    currentUser.isLoading ||
    (sessionSummary.isLoading && !sessionSummary.data)
  ) {
    return <SessionManagementSkeleton />;
  }

  return (
    <>
      <PageHeader
        title={actor === "admin" ? "Sessions" : "My sessions"}
        description={
          actor === "admin"
            ? "Manage requests, confirmed meetings, reschedules, and follow-up."
            : "Manage session requests in your scope and your confirmed meetings."
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>+ Create session</Button>
        }
      />
      <MetricGrid columns={4}>
        <StatCard
          label="Total sessions"
          value={sessionSummary.data?.total ?? 0}
          subline="In your current scope"
          dotColor="bid"
          accent="bid"
        />
        <StatCard
          label="Awaiting action"
          value={sessionSummary.data?.byStatus.requested ?? 0}
          subline="Open or targeted requests"
          dotColor="warning"
          accent="warning"
        />
        <StatCard
          label="Confirmed"
          value={sessionSummary.data?.byStatus.confirmed ?? 0}
          subline="Calendar event ready"
          dotColor="success"
          accent="success"
        />
        <StatCard
          label="Completed"
          value={sessionSummary.data?.byStatus.completed ?? 0}
          subline="Finished sessions"
          dotColor="info"
          accent="info"
        />
      </MetricGrid>

      <Card className="mt-4">
        <CardHeader
          title="Session queue"
          description={
            sessions.totalItems +
            " session" +
            (sessions.totalItems === 1 ? "" : "s") +
            " match these filters"
          }
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter sessions</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by topic, participant, programme, or session details.
            </div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[260px_180px_180px]">
            <TableFilterInput
              icon
              placeholder="Search sessions..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <TableFilterSelect
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
            >
              <option value="all">All statuses</option>
              <option value="requested">Awaiting action</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
              <option value="cancelled">Cancelled</option>
            </TableFilterSelect>
            <TableFilterAutocomplete
              value={type}
              onValueChange={(value) => setType(value)}
              options={sessionTypeOptions}
              placeholder="All types"
              searchPlaceholder="Search session types..."
              onSearchChange={setTypeSearch}
              isLoading={
                sessionTypes.isLoading || sessionTypes.isFetchingNextPage
              }
              hasMore={Boolean(sessionTypes.hasNextPage)}
              onLoadMore={() => void sessionTypes.fetchNextPage()}
            />
          </div>
        </TableToolbar>
        {sessions.isError ? (
          <Notice className="mb-4">
            Sessions could not be loaded. {sessions.error.message}
          </Notice>
        ) : sessions.isPlaceholderData ? (
          <TableSkeleton rows={Math.min(pageSize, 6)} columns={8} />
        ) : (
          <DataTable
            columns={columns}
            rows={sessions.rows}
            rowKey={(session) => session.id}
            emptyMessage="No sessions match these filters."
          />
        )}
        <TablePagination
          page={sessions.page}
          pageSize={pageSize}
          totalItems={sessions.totalItems}
          onPageChange={sessions.setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      <LinkedSessionDetailModal />
      <MessageModal
        open={Boolean(messageTarget)}
        onOpenChange={(next) => !next && setMessageTarget(null)}
        recipientName={
          messageTarget?.entrepreneur.businessName ?? "Entrepreneur"
        }
        recipientDetail={
          messageTarget
            ? messageTarget.topic +
              " · " +
              formatDateTime(messageTarget.startAt, viewerTimezone)
            : undefined
        }
        defaultSubject={
          messageTarget
            ? `Follow-up on ${messageTarget.topic}`
            : ""
        }
        onSubmit={async ({ subject, message, channel, priority }) => {
          if (!messageTarget) return;
          const result = await sendMessage.mutateAsync({
            id: messageTarget.id,
            subject,
            message,
            channel: channel === "in-app" ? "in_app" : "email",
            priority,
          });
          const delivery = result.deliveries.find(
            (entry) =>
              entry.channel ===
              (channel === "in-app" ? "in_app" : "email"),
          );
          if (delivery?.status === "skipped") {
            toast.info(
              channel === "in-app"
                ? "The recipient has disabled this in-app notification."
                : "The recipient has disabled this email notification.",
            );
          } else {
            toast.success(
              channel === "in-app"
                ? "In-app message sent"
                : "Email queued for delivery",
            );
          }
        }}
      />
      <ReasonModal
        target={declineTarget}
        title={
          declineTarget?.targetType === "open_team"
            ? "Leave open request"
            : "Decline session request"
        }
        label="Reason"
        value={reason}
        onChange={setReason}
        onClose={() => setDeclineTarget(null)}
        onSubmit={() =>
          declineTarget &&
          declineSession.mutate({
            id: declineTarget.id,
            reason,
          })
        }
        isSubmitting={declineSession.isPending}
        submitLabel={
          declineTarget?.targetType === "open_team"
            ? "Leave request"
            : "Decline request"
        }
        destructive
      />
      <ReasonModal
        target={cancelTarget}
        title="Cancel session"
        label="Cancellation reason"
        value={reason}
        onChange={setReason}
        onClose={() => setCancelTarget(null)}
        onSubmit={() =>
          cancelTarget && cancelSession.mutate({ id: cancelTarget.id, reason })
        }
        isSubmitting={cancelSession.isPending}
        submitLabel="Cancel session"
        destructive
      />
      <NoteModal
        target={noteTarget}
        title="Add session note"
        value={note}
        onChange={setNote}
        onClose={() => setNoteTarget(null)}
        onSubmit={() =>
          noteTarget &&
          addNote.mutate({
            id: noteTarget.id,
            note,
            visibility: "internal",
          })
        }
        isSubmitting={addNote.isPending}
        submitLabel="Save note"
      />
      <NoteModal
        target={completeTarget}
        title="Complete session"
        value={note}
        onChange={setNote}
        onClose={() => setCompleteTarget(null)}
        onSubmit={() =>
          completeTarget &&
          completeSession.mutate({
            id: completeTarget.id,
            note: note || undefined,
          })
        }
        isSubmitting={completeSession.isPending}
        submitLabel="Mark completed"
        optional
      />
      <SessionEditorModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        actor={actor}
        onSubmit={(values: SessionEditorValues) =>
          createSession.mutate({
            entrepreneurUserId: values.entrepreneurUserId,
            ownerUserId: values.ownerUserId,
            type: values.type,
            topic: values.topic,
            startAt: values.startAt,
            endAt: values.endAt,
            timezone: values.timezone,
            meetingProvider: "google_meet",
          })
        }
        isSubmitting={createSession.isPending}
      />
      <SessionEditorModal
        open={Boolean(rescheduleTarget)}
        onOpenChange={(next) => !next && setRescheduleTarget(null)}
        mode="reschedule"
        actor={actor}
        initialSession={rescheduleTarget}
        onSubmit={(values) =>
          rescheduleTarget &&
          rescheduleSession.mutate({
            id: rescheduleTarget.id,
            startAt: values.startAt,
            endAt: values.endAt,
            reason: values.reason,
          })
        }
        isSubmitting={rescheduleSession.isPending}
      />
    </>
  );
}

function ReasonModal({
  target,
  title,
  label,
  value,
  onChange,
  onClose,
  onSubmit,
  isSubmitting,
  submitLabel,
  destructive = false,
}: {
  target: SessionRecord | null;
  title: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={Boolean(target)}
      onOpenChange={(next) => !next && onClose()}
      title={title}
      width="wide"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
          <div className="text-sm font-medium text-ink">{target?.topic}</div>
          <div className="mt-1 text-sm text-ink-muted">
            {target?.entrepreneur.businessName}
          </div>
        </div>
        <FormField
          label={label}
          error={
            value.length > 0 && value.trim().length < 5
              ? "Add a short reason."
              : undefined
          }
        >
          <FormTextarea
            rows={4}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </FormField>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={destructive ? "destructive" : "primary"}
            disabled={value.trim().length < 5}
            isLoading={isSubmitting}
            loadingLabel="Saving"
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function NoteModal({
  target,
  title,
  value,
  onChange,
  onClose,
  onSubmit,
  isSubmitting,
  submitLabel,
  optional = false,
}: {
  target: SessionRecord | null;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  optional?: boolean;
}) {
  return (
    <Modal
      open={Boolean(target)}
      onOpenChange={(next) => !next && onClose()}
      title={title}
      width="wide"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <FormField label="Note" optional={optional}>
          <FormTextarea
            rows={5}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </FormField>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!optional && value.trim().length < 5}
            isLoading={isSubmitting}
            loadingLabel="Saving"
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SessionManagementSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading sessions" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <Card className="space-y-4">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </Card>
    </div>
  );
}
