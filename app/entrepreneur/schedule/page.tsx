'use client';

import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { BookingModal } from '@/components/entrepreneur/BookingModal';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { cn } from '@/lib/utils';
import type { Deliverable, Session } from '@/types';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type ScheduleCategory = 'mentoring' | 'group-session' | 'investor-prep' | 'deadline';

type CalendarItem = {
  id: string;
  source: 'session' | 'deliverable';
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: Session['location'];
  status?: Session['status'];
  category: ScheduleCategory;
  description?: string;
};

const categoryMeta: Record<ScheduleCategory, {
  label: string;
  dotClassName: string;
  borderClassName: string;
  badgeTone: 'brand' | 'blue' | 'amber' | 'green' | 'neutral';
}> = {
  mentoring: {
    label: 'Mentoring',
    dotClassName: 'bg-bid',
    borderClassName: 'border-l-bid',
    badgeTone: 'brand',
  },
  'group-session': {
    label: 'Group session',
    dotClassName: 'bg-info',
    borderClassName: 'border-l-info',
    badgeTone: 'blue',
  },
  deadline: {
    label: 'Deliverable deadline',
    dotClassName: 'bg-warning',
    borderClassName: 'border-l-warning',
    badgeTone: 'amber',
  },
  'investor-prep': {
    label: 'Investor prep',
    dotClassName: 'bg-success',
    borderClassName: 'border-l-success',
    badgeTone: 'green',
  },
};

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonth(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatEventDate(value: string) {
  return parseDate(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(value: string) {
  return parseDate(value).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
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
  if (item.source === 'deliverable') return 'Due';
  if (item.status === 'confirmed') return 'Confirmed';
  if (item.status === 'cancelled') return 'Cancelled';
  return 'Pending';
}

function getSessionCategory(session: Session): ScheduleCategory {
  if (session.type === 'investor-prep') return 'investor-prep';
  if (session.type === 'mentor-checkin') return 'mentoring';
  if (session.type === 'office-hours' || session.type === 'workshop') return 'group-session';
  return 'group-session';
}

function sessionToCalendarItem(session: Session): CalendarItem {
  return {
    id: session.id,
    source: 'session',
    title: session.title,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    location: session.location,
    status: session.status,
    category: getSessionCategory(session),
  };
}

function deliverableToCalendarItem(deliverable: Deliverable): CalendarItem | null {
  if (!deliverable.dueDate || deliverable.status === 'reviewed') return null;
  return {
    id: `deliverable-${deliverable.id}`,
    source: 'deliverable',
    title: `${deliverable.name} due`,
    date: deliverable.dueDate,
    category: 'deadline',
    description: deliverable.groupLabel,
  };
}

function sortCalendarItems(items: CalendarItem[]) {
  return [...items].sort((a, b) => {
    const aTime = `${a.date} ${a.startTime ?? '00:00'}`;
    const bTime = `${b.date} ${b.startTime ?? '00:00'}`;
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
  const { sessions, deliverables } = useEntrepreneurStore();
  const calendarItems = React.useMemo(
    () =>
      sortCalendarItems([
        ...sessions.map(sessionToCalendarItem),
        ...deliverables.map(deliverableToCalendarItem).filter((item): item is CalendarItem => Boolean(item)),
      ]),
    [deliverables, sessions],
  );
  const todayDate = React.useMemo(() => new Date(), []);
  const todayValue = React.useMemo(() => toDateValue(todayDate), [todayDate]);
  const [bookOpen, setBookOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(todayValue);
  const [visibleMonth, setVisibleMonth] = React.useState(todayDate);

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
  const nextItems = upcomingItems.slice(0, 3);
  const remainingUpcomingCount = Math.max(upcomingItems.length - nextItems.length, 0);
  const selectedItems = itemsByDate[selectedDate] ?? [];
  const monthCells = React.useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
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
          'group-session': 0,
          'investor-prep': 0,
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
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const goToToday = () => {
    setSelectedDate(todayValue);
    setVisibleMonth(todayDate);
  };

  return (
    <>
      <PageHeader
        title="Schedule"
        description={`Today is ${formatFullDate(todayValue)}. You are viewing ${formatMonth(visibleMonth)}.`}
        actions={<Button onClick={() => setBookOpen(true)}>+ Book session</Button>}
      />

      <Card padding="lg">
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-ink">
                  {isViewingCurrentMonth ? formatMonth(visibleMonth) : `Viewing ${formatMonth(visibleMonth)}`}
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  Select a date to see its agenda.
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => moveMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Next month" onClick={() => moveMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((day) => (
                <div key={day} className="pb-1 text-center text-[11px] font-medium text-ink-muted">
                  {day}
                </div>
              ))}
              {monthCells.map((date) => {
                const dateValue = toDateValue(date);
                const dayItems = itemsByDate[dateValue] ?? [];
                const isSelected = dateValue === selectedDate;
                const isToday = dateValue === todayValue;
                const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();

                return (
                  <button
                    key={dateValue}
                    type="button"
                    onClick={() => setSelectedDate(dateValue)}
                    className={cn(
                      'flex h-10 flex-col items-center justify-center rounded-lg border border-transparent text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-bid/20',
                      isOutsideMonth && !isSelected && 'bg-surface-subtle text-ink-faint hover:bg-surface-subtle/80',
                      !isOutsideMonth && !isToday && !isSelected && 'bg-surface-panel text-ink hover:border-bid/20 hover:bg-bid-light/60',
                      isToday && !isSelected && 'border-info/40 bg-info-light/40 text-info hover:bg-info-light/70',
                      isSelected && 'border-bid bg-bid text-white shadow-[0_10px_22px_rgba(132,39,81,0.2)] hover:bg-bid-dark',
                    )}
                  >
                    <span>{date.getDate()}</span>
                    {dayItems.length > 0 && (
                      <span className="mt-1 flex gap-0.5">
                        {dayItems.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              isSelected ? 'bg-white' : categoryMeta[item.category].dotClassName,
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
              {(['mentoring', 'group-session', 'investor-prep', 'deadline'] as ScheduleCategory[]).map((category) => (
                <div key={category} className="flex items-center justify-between rounded-lg bg-surface-subtle px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
                    <span className={cn('h-2 w-2 rounded-full', categoryMeta[category].dotClassName)} />
                    {categoryMeta[category].label}
                  </span>
                  <span className="text-sm font-semibold text-ink">{monthCategoryCounts[category]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="self-start rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,26,0.035)]">
            <CardHeader
              title={isSelectedToday ? 'Today' : 'Selected date'}
              description={formatFullDate(selectedDate)}
              actions={
                <Badge tone={selectedItems.length > 0 ? 'brand' : 'neutral'}>
                  {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}
                </Badge>
              }
            />
            <div className="grid gap-2">
              {selectedItems.length > 0 ? (
                selectedItems.map((item) => (
                  <ScheduleEventCard key={item.id} item={item} />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-line bg-surface-subtle px-4 py-8 text-center">
                  <CalendarDays className="mx-auto h-6 w-6 text-ink-faint" />
                  <div className="mt-2 text-sm font-medium text-ink">Nothing planned for this date</div>
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
            remainingUpcomingCount > 0 ? (
              <Badge tone="neutral">+{remainingUpcomingCount} later</Badge>
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

      <BookingModal open={bookOpen} onOpenChange={setBookOpen} />
    </>
  );
}

function ScheduleEventCard({
  item,
  compact = false,
  onSelect,
}: {
  item: CalendarItem;
  compact?: boolean;
  onSelect?: () => void;
}) {
  const meta = categoryMeta[item.category];
  const content = (
    <>
      <div className="flex items-start gap-3">
        <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', meta.dotClassName)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="font-mono text-xs text-ink-muted">
              {formatEventDate(item.date)}
            </div>
            <Badge tone={meta.badgeTone}>
              {getItemLabel(item)}
            </Badge>
          </div>
          <div className={cn('mt-2 font-semibold text-ink', compact ? 'text-sm' : 'text-base')}>
            {item.title}
          </div>
          {item.description && (
            <div className="mt-1 text-sm text-ink-muted">{item.description}</div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted">
            {item.startTime ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                {item.startTime}
                {item.endTime ? `-${item.endTime}` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                Due date
              </span>
            )}
            {item.source === 'session' && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {item.location === 'in-person' ? 'In person' : 'Virtual'}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const className = cn(
    'rounded-xl border border-black/[0.07] bg-white px-4 py-3 text-left shadow-sm transition',
    onSelect && 'w-full hover:border-bid/25 hover:bg-surface-subtle',
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
