"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Modal } from "@/components/shared/Modal";
import { FormField, FormTextarea } from "@/components/shared/FormField";
import { toast } from "sonner";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { BookingModal } from "@/components/entrepreneur/BookingModal";
import { LinkedSessionDetailModal } from "@/components/sessions/LinkedSessionDetailModal";
import { cn } from "@/lib/utils";
import {
  useDeliverableCalendarWindowQuery,
  type DeliverableInstance,
} from "@/lib/api/deliverables";
import {
  useCancelSessionMutation,
  useSessionCalendarWindowQuery,
  type SessionRecord,
  type SessionStatus,
} from "@/lib/api/sessions";
import { useEntrepreneurProfileQuery } from "@/lib/api/entrepreneurs";
import {
  PLATFORM_DEFAULT_TIMEZONE,
  todayInTimezone,
} from "@/lib/timezones";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ScheduleCategory =
  "mentoring" | "group-session" | "investor-prep" | "deadline";

type CalendarItem = {
  id: string;
  source: "session" | "deliverable";
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: "virtual" | "in-person";
  meetingProvider?: string;
  meetingUrl?: string;
  status?: SessionStatus;
  category: ScheduleCategory;
  description?: string;
};

const categoryMeta: Record<
  ScheduleCategory,
  {
    label: string;
    dotClassName: string;
    borderClassName: string;
    badgeTone: "brand" | "blue" | "amber" | "green" | "neutral";
  }
> = {
  mentoring: {
    label: "Mentoring",
    dotClassName: "bg-bid",
    borderClassName: "border-l-bid",
    badgeTone: "brand",
  },
  "group-session": {
    label: "Group session",
    dotClassName: "bg-info",
    borderClassName: "border-l-info",
    badgeTone: "blue",
  },
  deadline: {
    label: "Deliverable deadline",
    dotClassName: "bg-warning",
    borderClassName: "border-l-warning",
    badgeTone: "amber",
  },
  "investor-prep": {
    label: "Investor prep",
    dotClassName: "bg-success",
    borderClassName: "border-l-success",
    badgeTone: "green",
  },
};

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatEventDate(value: string) {
  return parseDate(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(value: string) {
  return parseDate(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildMonthCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getItemLabel(item: CalendarItem) {
  if (item.source === "deliverable") return "Due";
  if (item.status === "confirmed") return "Confirmed";
  if (item.status === "cancelled") return "Cancelled";
  return "Pending";
}

function getSessionCategory(session: SessionRecord): ScheduleCategory {
  if (session.type === "investor_prep") return "investor-prep";
  if (session.type === "mentor_checkin") return "mentoring";
  return "group-session";
}

function dateValueInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function sessionToCalendarItem(
  session: SessionRecord,
  timezone: string,
): CalendarItem {
  const startAt = new Date(session.startAt);
  const endAt = new Date(session.endAt);
  return {
    id: session.id,
    source: "session",
    title: session.topic,
    date: dateValueInTimezone(startAt, timezone),
    startTime: startAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }),
    endTime: endAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }),
    location: "virtual",
    meetingProvider: session.meetingProvider,
    meetingUrl: session.meetingUrl ?? undefined,
    status: session.status,
    category: getSessionCategory(session),
  };
}

function deliverableToCalendarItem(
  deliverable: DeliverableInstance,
): CalendarItem | null {
  if (deliverable.status === "approved") return null;
  return {
    id: `deliverable-${deliverable.id}`,
    source: "deliverable",
    title: `${deliverable.deliverable} due`,
    date: toDateValue(new Date(deliverable.dueDate)),
    category: "deadline",
    description: deliverable.programme.name,
  };
}

function sortCalendarItems(items: CalendarItem[]) {
  return [...items].sort((a, b) => {
    const aTime = `${a.date} ${a.startTime ?? "00:00"}`;
    const bTime = `${b.date} ${b.startTime ?? "00:00"}`;
    return aTime.localeCompare(bTime);
  });
}

function isSameMonth(value: string, monthDate: Date) {
  const date = parseDate(value);
  return (
    date.getFullYear() === monthDate.getFullYear() &&
    date.getMonth() === monthDate.getMonth()
  );
}

export default function SchedulePage() {
  const profile = useEntrepreneurProfileQuery();
  const timezone = profile.data?.timezone ?? PLATFORM_DEFAULT_TIMEZONE;

  if (profile.isLoading) {
    return <SchedulePageSkeleton />;
  }

  return <SchedulePageContent key={timezone} timezone={timezone} />;
}

function SchedulePageContent({ timezone }: { timezone: string }) {
  const todayValue = todayInTimezone(timezone);
  const todayDate = React.useMemo(() => parseDate(todayValue), [todayValue]);
  const [bookOpen, setBookOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(todayValue);
  const [visibleMonth, setVisibleMonth] = React.useState(todayDate);
  const [nextPage, setNextPage] = React.useState(1);
  const [cancelTarget, setCancelTarget] = React.useState<CalendarItem | null>(
    null,
  );
  const [cancelReason, setCancelReason] = React.useState("");
  const cancelSession = useCancelSessionMutation({
    onSuccess: () => {
      toast.success("Session cancelled");
      setCancelTarget(null);
      setCancelReason("");
    },
    onError: (error) => toast.error(error.message),
  });
  const monthCells = React.useMemo(
    () => buildMonthCells(visibleMonth),
    [visibleMonth],
  );
  const windowStart = monthCells[0];
  const windowEnd = monthCells[monthCells.length - 1];
  const dateFrom = new Date(
    Date.UTC(
      windowStart.getFullYear(),
      windowStart.getMonth(),
      windowStart.getDate() - 1,
    ),
  ).toISOString();
  const dateTo = new Date(
    Date.UTC(
      windowEnd.getFullYear(),
      windowEnd.getMonth(),
      windowEnd.getDate() + 2,
    ) - 1,
  ).toISOString();
  const sessionsQuery = useSessionCalendarWindowQuery({
    dateFrom,
    dateTo,
    take: 50,
  });
  const deliverablesQuery = useDeliverableCalendarWindowQuery({
    dateFrom,
    dateTo,
    take: 50,
  });
  const calendarItems = React.useMemo(
    () =>
      sortCalendarItems([
        ...sessionsQuery.rows.map((session) =>
          sessionToCalendarItem(session, timezone),
        ),
        ...deliverablesQuery.rows
          .map(deliverableToCalendarItem)
          .filter((item): item is CalendarItem => Boolean(item)),
      ]),
    [deliverablesQuery.rows, sessionsQuery.rows, timezone],
  );

  const itemsByDate = React.useMemo(() => {
    return calendarItems.reduce<Record<string, CalendarItem[]>>((acc, item) => {
      acc[item.date] = [...(acc[item.date] ?? []), item];
      return acc;
    }, {});
  }, [calendarItems]);

  const upcomingItems = React.useMemo(
    () => calendarItems.filter((item) => item.date >= todayValue),
    [calendarItems, todayValue],
  );
  const nextPageSize = 3;
  const nextTotalPages = Math.max(
    1,
    Math.ceil(upcomingItems.length / nextPageSize),
  );
  const currentNextPage = Math.min(nextPage, nextTotalPages);
  const nextItems = upcomingItems.slice(
    (currentNextPage - 1) * nextPageSize,
    currentNextPage * nextPageSize,
  );
  const nextStart =
    upcomingItems.length === 0
      ? 0
      : (currentNextPage - 1) * nextPageSize + 1;
  const nextEnd = Math.min(
    currentNextPage * nextPageSize,
    upcomingItems.length,
  );
  const selectedItems = itemsByDate[selectedDate] ?? [];
  const monthItems = React.useMemo(
    () => calendarItems.filter((item) => isSameMonth(item.date, visibleMonth)),
    [calendarItems, visibleMonth],
  );
  const monthCategoryCounts = React.useMemo(
    () =>
      monthItems.reduce<Record<ScheduleCategory, number>>(
        (counts, item) => ({
          ...counts,
          [item.category]: counts[item.category] + 1,
        }),
        {
          mentoring: 0,
          "group-session": 0,
          "investor-prep": 0,
          deadline: 0,
        },
      ),
    [monthItems],
  );
  const isViewingCurrentMonth =
    visibleMonth.getFullYear() === todayDate.getFullYear() &&
    visibleMonth.getMonth() === todayDate.getMonth();
  const isSelectedToday = selectedDate === todayValue;

  const moveMonth = (offset: number) => {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const goToToday = () => {
    setSelectedDate(todayValue);
    setVisibleMonth(todayDate);
  };

  if (
    (sessionsQuery.isLoading && !sessionsQuery.data) ||
    (deliverablesQuery.isLoading && !deliverablesQuery.data)
  ) {
    return <SchedulePageSkeleton />;
  }

  if (sessionsQuery.isError || deliverablesQuery.isError) {
    return (
      <>
        <PageHeader
          title="Schedule"
          description="Your sessions and deliverable deadlines could not be loaded."
        />
        <Card padding="lg" className="text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-ink-faint" />
          <div className="mt-3 font-semibold text-ink">
            Schedule unavailable
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Try loading this calendar window again.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              void sessionsQuery.refetch();
              void deliverablesQuery.refetch();
            }}
          >
            Try again
          </Button>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        description={`Today is ${formatFullDate(todayValue)}. You are viewing ${formatMonth(visibleMonth)}.`}
        actions={
          <Button onClick={() => setBookOpen(true)}>+ Book session</Button>
        }
      />

      <Card padding="lg">
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-ink">
                  {isViewingCurrentMonth
                    ? formatMonth(visibleMonth)
                    : `Viewing ${formatMonth(visibleMonth)}`}
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  Select a date to see its agenda.
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() => moveMonth(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => moveMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="pb-1 text-center text-[11px] font-medium text-ink-muted"
                >
                  {day}
                </div>
              ))}
              {monthCells.map((date) => {
                const dateValue = toDateValue(date);
                const dayItems = itemsByDate[dateValue] ?? [];
                const isSelected = dateValue === selectedDate;
                const isToday = dateValue === todayValue;
                const isOutsideMonth =
                  date.getMonth() !== visibleMonth.getMonth();

                return (
                  <button
                    key={dateValue}
                    type="button"
                    onClick={() => setSelectedDate(dateValue)}
                    className={cn(
                      "flex h-10 flex-col items-center justify-center rounded-lg border border-transparent text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-bid/20",
                      isOutsideMonth &&
                        !isSelected &&
                        "bg-surface-subtle text-ink-faint hover:bg-surface-subtle/80",
                      !isOutsideMonth &&
                        !isToday &&
                        !isSelected &&
                        "bg-surface-panel text-ink hover:border-bid/20 hover:bg-bid-light/60",
                      isToday &&
                        !isSelected &&
                        "border-info/40 bg-info-light/40 text-info hover:bg-info-light/70",
                      isSelected &&
                        "border-bid bg-bid text-white shadow-[0_10px_22px_rgba(132,39,81,0.2)] hover:bg-bid-dark",
                    )}
                  >
                    <span>{date.getDate()}</span>
                    {dayItems.length > 0 && (
                      <span className="mt-1 flex gap-0.5">
                        {dayItems.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              isSelected
                                ? "bg-primary-foreground"
                                : categoryMeta[item.category].dotClassName,
                            )}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(
                [
                  "mentoring",
                  "group-session",
                  "investor-prep",
                  "deadline",
                ] as ScheduleCategory[]
              ).map((category) => (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-lg bg-surface-subtle px-3 py-2"
                >
                  <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        categoryMeta[category].dotClassName,
                      )}
                    />
                    {categoryMeta[category].label}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {monthCategoryCounts[category]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="self-start rounded-2xl border border-border bg-card p-4 shadow-[0_12px_28px_rgba(26,26,26,0.035)]">
            <CardHeader
              title={isSelectedToday ? "Today" : "Selected date"}
              description={formatFullDate(selectedDate)}
              actions={
                <Badge tone={selectedItems.length > 0 ? "brand" : "neutral"}>
                  {selectedItems.length} item
                  {selectedItems.length === 1 ? "" : "s"}
                </Badge>
              }
            />
            <div className="grid gap-2">
              {selectedItems.length > 0 ? (
                selectedItems.map((item) => (
                  <ScheduleEventCard
                    key={item.id}
                    item={item}
                    onCancel={() => {
                      setCancelTarget(item);
                      setCancelReason("");
                    }}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-line bg-surface-subtle px-4 py-8 text-center">
                  <CalendarDays className="mx-auto h-6 w-6 text-ink-faint" />
                  <div className="mt-2 text-sm font-medium text-ink">
                    Nothing planned for this date
                  </div>
                  <div className="mt-1 text-sm text-ink-muted">
                    Pick another date or book a support session.
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Next up"
          description="A short queue of what needs attention soon."
          actions={
            upcomingItems.length > nextPageSize ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-muted">
                  {nextStart}-{nextEnd} of {upcomingItems.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous upcoming items"
                  disabled={currentNextPage === 1}
                  onClick={() => setNextPage(Math.max(1, currentNextPage - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next upcoming items"
                  disabled={currentNextPage === nextTotalPages}
                  onClick={() =>
                    setNextPage(
                      Math.min(nextTotalPages, currentNextPage + 1),
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : undefined
          }
        />
        <div className="grid gap-2 lg:grid-cols-3">
          {nextItems.map((item) => (
            <ScheduleEventCard
              key={item.id}
              item={item}
              compact
              onSelect={() => {
                setSelectedDate(item.date);
                setVisibleMonth(parseDate(item.date));
              }}
            />
          ))}
          {nextItems.length === 0 && (
            <p className="py-4 text-center text-sm text-ink-faint lg:col-span-3">
              No upcoming sessions or due dates.
            </p>
          )}
        </div>
      </Card>

      <LinkedSessionDetailModal />
      <BookingModal open={bookOpen} onOpenChange={setBookOpen} />
      <Modal
        open={Boolean(cancelTarget)}
        onOpenChange={(next) => !next && setCancelTarget(null)}
        title="Cancel session"
        width="wide"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (cancelTarget) {
              cancelSession.mutate({
                id: cancelTarget.id,
                reason: cancelReason,
              });
            }
          }}
        >
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3 text-sm font-medium text-ink">
            {cancelTarget?.title}
          </div>
          <FormField
            label="Cancellation reason"
            error={
              cancelReason.length > 0 && cancelReason.trim().length < 5
                ? "Add a short reason."
                : undefined
            }
          >
            <FormTextarea
              rows={4}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTarget(null)}
            >
              Keep session
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={cancelReason.trim().length < 5}
              isLoading={cancelSession.isPending}
              loadingLabel="Cancelling"
            >
              Cancel session
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ScheduleEventCard({
  item,
  compact = false,
  onSelect,
  onCancel,
}: {
  item: CalendarItem;
  compact?: boolean;
  onSelect?: () => void;
  onCancel?: () => void;
}) {
  const meta = categoryMeta[item.category];
  const canCancel =
    item.source === "session" &&
    (item.status === "requested" || item.status === "confirmed");
  const canJoinMeeting =
    item.source === "session" &&
    item.status === "confirmed" &&
    item.location !== "in-person" &&
    Boolean(item.meetingUrl);
  const content = (
    <>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
            meta.dotClassName,
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="font-mono text-xs text-ink-muted">
              {formatEventDate(item.date)}
            </div>
            <Badge tone={meta.badgeTone}>{getItemLabel(item)}</Badge>
          </div>
          <div
            className={cn(
              "mt-2 font-semibold text-ink",
              compact ? "text-sm" : "text-base",
            )}
          >
            {item.title}
          </div>
          {item.description && (
            <div className="mt-1 text-sm text-ink-muted">
              {item.description}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted">
            {item.startTime ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                {item.startTime}
                {item.endTime ? `-${item.endTime}` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                Due date
              </span>
            )}
            {item.source === "session" && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {item.location === "in-person" ? "In person" : "Virtual"}
              </span>
            )}
          </div>
          {canCancel && onCancel && !onSelect ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onCancel}
            >
              Cancel session
            </Button>
          ) : null}
          {canJoinMeeting && (
            <a
              href={item.meetingUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-bid px-3 py-2 text-sm font-medium text-white transition hover:bg-bid-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
            >
              Join meeting
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </>
  );

  const className = cn(
    "rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition",
    onSelect && "w-full hover:border-bid/25 hover:bg-surface-subtle",
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function SchedulePageSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading schedule" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Card>
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </Card>
      <Skeleton className="h-44 w-full" />
    </div>
  );
}
