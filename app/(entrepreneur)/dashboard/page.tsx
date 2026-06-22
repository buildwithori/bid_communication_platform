'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { recentActivity } from '@/lib/mock-data';
import { BookingModal } from '@/components/entrepreneur/BookingModal';

const accentDot: Record<string, string> = {
  bid: 'bg-bid',
  info: 'bg-info',
  warning: 'bg-warning',
  neutral: 'bg-ink-muted',
};

export default function EntrepreneurDashboardPage() {
  const { entrepreneur, sessions } = useEntrepreneurStore();
  const [bookOpen, setBookOpen] = React.useState(false);
  const greeting = `Good morning, ${entrepreneur.businessName}`;
  const upcoming = sessions.slice(0, 3);

  return (
    <>
      <PageHeader
        title={`${greeting} 👋`}
        description="Your journey at a glance · April 2025"
        actions={
          <Link href="/training">
            <Button variant="outline">
              Continue learning
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Training progress"
          value={
            <>
              {entrepreneur.metrics.trainingProgress}
              <span className="text-[13px] text-ink-muted">%</span>
            </>
          }
          subline={`${17} of 25 items`}
          dotColor="bid"
        />
        <StatCard
          label="Deliverables"
          value={
            <>
              {entrepreneur.metrics.deliverablesDone}
              <span className="text-[13px] text-ink-muted">/{entrepreneur.metrics.deliverablesTotal}</span>
            </>
          }
          subline="3 pending"
          dotColor="warning"
        />
        <StatCard
          label="Next session"
          value={<span className="mt-0.5 text-sm">Apr 14</span>}
          subline="Mentor check-in"
          dotColor="info"
        />
        <StatCard
          label="Current goal"
          value={
            <span className="mt-0.5 text-sm">
              ${(entrepreneur.goal.amountUsd ?? 0) / 1000}k
            </span>
          }
          subline="Series A target"
          dotColor="bid"
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Recent activity */}
        <Card>
          <CardHeader
            title="Recent activity"
            actions={<Badge tone="brand">Live</Badge>}
          />
          <div className="flex flex-col">
            {recentActivity.map((a) => (
              <div
                key={a.id}
                className="flex gap-2 border-b border-line py-1.5 last:border-b-0"
              >
                <span
                  className={`mt-1 h-[7px] w-[7px] shrink-0 rounded-full ${accentDot[a.accent]}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] leading-relaxed">
                    {a.text}
                    {a.emphasis && (
                      <strong>
                        {a.id === 'act-3'
                          ? `${a.emphasis} due in 3 days`
                          : a.emphasis}
                      </strong>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] text-ink-faint">
                    {a.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming sessions */}
        <Card>
          <CardHeader
            title="Upcoming sessions"
            actions={
              <Link href="/schedule">
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          <div className="flex flex-col gap-1.5">
            {upcoming.map((s) => {
              const borderClass =
                s.accent === 'bid'
                  ? 'border-l-bid'
                  : s.accent === 'info'
                    ? 'border-l-info'
                    : 'border-l-warning';
              return (
                <div
                  key={s.id}
                  className={`rounded-md border-l-[3px] ${borderClass} bg-surface-subtle px-3 py-2`}
                >
                  <div className="font-mono text-[10px] text-ink-muted">
                    {new Date(s.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {s.startTime ? ` · ${s.startTime}` : ''}
                  </div>
                  <div className="text-[11px] font-medium">{s.title}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <BookingModal open={bookOpen} onOpenChange={setBookOpen} />
      <div className="mt-3">
        <Button onClick={() => setBookOpen(true)}>+ Book meeting</Button>
      </div>
    </>
  );
}
