'use client';

import * as React from 'react';
import { CalendarCheck2, CalendarDays, Clock3, ExternalLink, RefreshCw, UserRound } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Skeleton } from '@/components/shared/Card';
import { Modal } from '@/components/shared/Modal';
import { Notice } from '@/components/shared/PageHeader';
import {
  useRetrySessionCalendarMutation,
  useSessionDetailQuery,
  type CalendarAttendeeResponseStatus,
  type SessionRecord,
  type SessionStatus,
} from '@/lib/api/sessions';
import { useCurrentUserQuery } from '@/lib/api/auth';
import { PLATFORM_DEFAULT_TIMEZONE } from '@/lib/timezones';
import { AddToCalendarMenu } from './AddToCalendarMenu';

const statusMeta: Record<SessionStatus, { label: string; tone: 'amber' | 'green' | 'red' | 'neutral' }> = {
  requested: { label: 'Awaiting team', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'green' },
  declined: { label: 'Declined', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  completed: { label: 'Completed', tone: 'neutral' },
};

export function LinkedSessionDetailModal() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId');
  const session = useSessionDetailQuery(sessionId);
  const currentUser = useCurrentUserQuery();
  const detail = session.data as SessionRecord | undefined;
  const retryProvisioning = useRetrySessionCalendarMutation();
  const timezone =
    currentUser.data?.user?.timezone ??
    detail?.timezone ??
    PLATFORM_DEFAULT_TIMEZONE;

  const close = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('sessionId');
    const query = params.toString();
    router.replace((query ? `${pathname}?${query}` : pathname) as never, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <Modal open={Boolean(sessionId)} onOpenChange={(next) => !next && close()} title="Session details" width="wide">
      {session.isLoading ? <SessionDetailSkeleton /> : null}
      {session.isError ? (
        <div>
          <Notice>This session is unavailable or is outside your workspace access.</Notice>
          <div className="mt-4 flex justify-end"><Button variant="outline" onClick={close}>Close</Button></div>
        </div>
      ) : null}
      {detail ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-bid/15 bg-bid-light/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bid-dark">{detail.typeName}</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{detail.topic}</h3>
                <p className="mt-1 text-sm text-ink-muted">{detail.entrepreneur.businessName}</p>
              </div>
              <Badge tone={statusMeta[detail.status].tone}>{statusMeta[detail.status].label}</Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail icon={<CalendarDays className="h-4 w-4" />} label="Date" value={formatDate(detail.startAt, timezone)} />
            <Detail icon={<Clock3 className="h-4 w-4" />} label="Time" value={formatTimeRange(detail.startAt, detail.endAt, timezone)} />
            <Detail icon={<UserRound className="h-4 w-4" />} label="Session owner" value={detail.owner?.name ?? detail.target?.name ?? 'Any available BID team member'} />
            <Detail icon={<UserRound className="h-4 w-4" />} label="Requested by" value={detail.createdBy.name} />
            {detail.calendarResponseStatus ? (
              <Detail
                icon={<CalendarCheck2 className="h-4 w-4" />}
                label="Calendar response"
                value={calendarResponseLabel(detail.calendarResponseStatus)}
              />
            ) : null}
          </div>

          {detail.programme ? (
            <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
              <p className="text-xs font-medium text-ink-muted">Programme</p>
              <p className="mt-1 text-sm font-medium text-ink">{detail.programme.name}</p>
            </div>
          ) : null}

          {detail.declinedReason || detail.cancelledReason ? (
            <Notice>{detail.declinedReason ?? detail.cancelledReason}</Notice>
          ) : null}

          {detail.status === 'confirmed' &&
          (detail.calendarProvisioningStatus === 'pending' ||
            detail.calendarProvisioningStatus === 'processing') ? (
            <Notice className="flex items-center gap-3 border border-bid/15 bg-bid-light/45 text-ink">
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-bid" />
              <span>
                We’re preparing the calendar invitation and joining details.
                This page will update automatically.
              </span>
            </Notice>
          ) : null}

          {detail.status === 'confirmed' &&
          detail.calendarProvisioningStatus === 'failed' ? (
            <Notice className="border border-warning/25 bg-warning/10 text-ink">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {currentUser.data?.user?.role === 'entrepreneur'
                    ? 'The calendar invitation is delayed. You can still add this session to your calendar below.'
                    : detail.calendarProvisioningError ??
                      'The calendar invitation could not be prepared. You can retry it now.'}
                </span>
                {currentUser.data?.user?.role !== 'entrepreneur' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={retryProvisioning.isPending}
                    loadingLabel="Retrying..."
                    onClick={() => retryProvisioning.mutate(detail.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry calendar setup
                  </Button>
                ) : null}
              </div>
            </Notice>
          ) : null}

          {detail.reschedules.length ? (
            <section>
              <h4 className="text-sm font-semibold text-ink">Reschedule history</h4>
              <div className="mt-2 max-h-36 space-y-2 overflow-y-auto">
                {detail.reschedules.map((item) => (
                  <div key={item.id} className="rounded-xl border border-line px-3 py-2 text-xs text-ink-muted">
                    <span className="font-medium text-ink">{formatDate(item.newStartAt, timezone)} at {formatTime(item.newStartAt, timezone)}</span>
                    {item.reason ? ` · ${item.reason}` : ''}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {detail.notesHistory.length ? (
            <section>
              <h4 className="text-sm font-semibold text-ink">Session notes</h4>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {detail.notesHistory.map((item) => (
                  <div key={item.id} className="rounded-xl border border-line bg-surface-subtle px-3 py-2">
                    <p className="text-sm text-ink">{item.note}</p>
                    <p className="mt-1 text-xs text-ink-muted">{item.author.name} · {formatDate(item.createdAt, timezone)}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            {detail.status === 'confirmed' || detail.status === 'completed' ? (
              <AddToCalendarMenu session={detail} />
            ) : null}
            {detail.status === 'confirmed' && detail.meetingUrl ? (
              <Button asChild>
                <a href={detail.meetingUrl} target="_blank" rel="noreferrer">Open Google Meet <ExternalLink className="h-4 w-4" /></a>
              </Button>
            ) : null}
            <Button variant="outline" onClick={close}>Close</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex gap-3 rounded-xl border border-line px-3 py-3">
    <span className="mt-0.5 text-bid">{icon}</span>
    <div><p className="text-xs text-ink-muted">{label}</p><p className="mt-1 text-sm font-medium text-ink">{value}</p></div>
  </div>;
}

function SessionDetailSkeleton() {
  return <div aria-label="Loading session details" aria-busy="true" className="space-y-3">
    <Skeleton className="h-28 w-full" />
    <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>
    <Skeleton className="h-24 w-full" />
  </div>;
}

function formatDate(value: string, timezone: string) {
  return new Date(value).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: timezone });
}
function formatTime(value: string, timezone: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone });
}
function formatTimeRange(start: string, end: string, timezone: string) {
  return `${formatTime(start, timezone)} – ${formatTime(end, timezone)} · ${timezone}`;
}
function calendarResponseLabel(status: CalendarAttendeeResponseStatus) {
  if (status === 'accepted') return 'Accepted';
  if (status === 'tentative') return 'Tentative';
  if (status === 'declined') return 'Declined';
  return 'Response pending';
}
