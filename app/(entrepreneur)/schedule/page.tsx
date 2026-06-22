'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { BookingModal } from '@/components/entrepreneur/BookingModal';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { cn } from '@/lib/utils';

const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** Build a simple April 2025 calendar grid. */
function buildAprilDays() {
  // April 1 2025 is a Tuesday.
  const offset = 1; // Mon=0, Tue=1
  const daysInMonth = 30;
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const accentColors: Record<string, string> = {
  bid: 'border-l-bid',
  info: 'border-l-info',
  success: 'border-l-success',
  warning: 'border-l-warning',
  neutral: 'border-l-ink-muted',
};

const badgeTone: Record<string, 'brand' | 'blue' | 'amber' | 'neutral'> = {
  bid: 'brand',
  info: 'blue',
  warning: 'amber',
  neutral: 'neutral',
  success: 'brand',
};

export default function SchedulePage() {
  const { sessions } = useEntrepreneurStore();
  const [bookOpen, setBookOpen] = React.useState(false);
  const cells = buildAprilDays();

  // Map session dates → day-of-month for highlight.
  const sessionDayMap = new Map<number, boolean>();
  sessions.forEach((s) => {
    const day = new Date(s.date).getDate();
    sessionDayMap.set(day, true);
  });
  const today = 9;

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Book sessions and manage your calendar"
        actions={<Button onClick={() => setBookOpen(true)}>+ Book session</Button>}
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Calendar */}
        <Card>
          <CardHeader
            title="April 2025"
            actions={
              <div className="flex gap-1">
                <Button variant="outline" size="sm" aria-label="Previous month">‹</Button>
                <Button variant="outline" size="sm" aria-label="Next month">›</Button>
              </div>
            }
          />
          <div className="mt-1.5 grid grid-cols-7">
            {days.map((d) => (
              <div
                key={d}
                className="px-0.5 py-1.5 text-center text-[9px] font-medium text-ink-faint"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) {
                return <div key={i} className="px-0.5 py-1.5 text-center text-[10px] opacity-30" />;
              }
              const hasSession = sessionDayMap.has(d);
              const isToday = d === today;
              return (
                <div
                  key={i}
                  className={cn(
                    'cursor-pointer rounded px-0.5 py-1.5 text-center text-[10px] transition-colors',
                    isToday
                      ? 'bg-bid font-semibold text-white'
                      : hasSession
                        ? 'bg-bid-light font-medium text-bid-dark'
                        : 'text-ink hover:bg-surface-subtle',
                  )}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader title="Upcoming events" />
          <div className="flex flex-col gap-1.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'rounded-md border-l-[3px] bg-surface-subtle px-3 py-2',
                  accentColors[s.accent] ?? accentColors.neutral,
                )}
              >
                <div className="font-mono text-[10px] text-ink-muted">
                  {new Date(s.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {s.startTime ? ` · ${s.startTime}` : ''}
                  {s.endTime ? `–${s.endTime}` : ''}
                </div>
                <div className="text-[11px] font-medium">{s.title}</div>
                <Badge tone={badgeTone[s.accent] ?? 'neutral'} className="mt-1">
                  {s.isDeadline
                    ? 'Deadline'
                    : s.status === 'confirmed'
                      ? 'Confirmed'
                      : 'Pending'}
                </Badge>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="py-4 text-center text-[11px] text-ink-faint">
                No sessions scheduled.
              </p>
            )}
          </div>
        </Card>
      </div>
      <BookingModal open={bookOpen} onOpenChange={setBookOpen} />
    </>
  );
}
