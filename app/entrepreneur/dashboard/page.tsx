'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarPlus, CheckCircle2, Clock3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Card, CardHeader } from '@/components/shared/Card';
import { ChartCard } from '@/components/shared/ChartCard';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { recentActivity } from '@/lib/mock-data';
import { BookingModal } from '@/components/entrepreneur/BookingModal';
import { routes } from '@/lib/routes';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const accentDot: Record<string, string> = {
  bid: 'bg-bid',
  info: 'bg-info',
  warning: 'bg-warning',
  neutral: 'bg-ink-muted',
};

function toLocalDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function EntrepreneurDashboardPage() {
  const { entrepreneur, sessions, deliverables } = useEntrepreneurStore();
  const [bookOpen, setBookOpen] = React.useState(false);
  const greeting = `Good morning, ${entrepreneur.businessName}`;
  const todayValue = React.useMemo(() => toLocalDateValue(new Date()), []);
  const upcoming = React.useMemo(
    () =>
      [...sessions]
        .filter((session) => session.date >= todayValue)
        .sort((a, b) => `${a.date} ${a.startTime ?? '00:00'}`.localeCompare(`${b.date} ${b.startTime ?? '00:00'}`))
        .slice(0, 3),
    [sessions, todayValue],
  );
  const nextSession = upcoming[0];
  const pendingDeliverables = deliverables.filter((d) => d.status === 'pending' || d.status === 'overdue').length;
  const activeDeliverables = deliverables
    .filter((d) => d.status === 'pending' || d.status === 'overdue' || d.status === 'submitted')
    .slice(0, 4);
  const progressTrend = [
    { week: 'W1', training: 32 },
    { week: 'W2', training: 44 },
    { week: 'W3', training: 57 },
    { week: 'W4', training: entrepreneur.metrics.trainingProgress },
  ];

  return (
    <>
      <PageHeader
        title={greeting}
        description="Your learning progress, deliverables, and upcoming support in one place."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setBookOpen(true)} variant="outline">
              <CalendarPlus className="h-4 w-4" />
              Book meeting
            </Button>
            <Link href={routes.entrepreneur.training}>
              <Button>
                Continue learning
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        }
      />

      <MetricGrid columns={3}>
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
          accent="bid"
        />
        <StatCard
          label="Deliverables"
          value={
            <>
              {entrepreneur.metrics.deliverablesDone}
              <span className="text-[13px] text-ink-muted">/{entrepreneur.metrics.deliverablesTotal}</span>
            </>
          }
          subline={`${pendingDeliverables} pending`}
          dotColor="warning"
          accent="warning"
        />
        <StatCard
          label="Next session"
          value={
            <span className="mt-0.5 text-sm">
              {nextSession
                ? new Date(nextSession.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'None'}
            </span>
          }
          subline={nextSession?.title ?? 'No upcoming session'}
          dotColor="info"
          accent="info"
        />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <ChartCard
          title="Training progress trend"
          description="How your completed training has moved across the month"
          legend={[
            { label: 'Training progress', colorClassName: 'bg-bid' },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={progressTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="entrepreneurTraining" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#842751" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#842751" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#666', fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Training progress']}
                contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }}
              />
              <ReferenceLine y={100} stroke="rgba(132,39,81,0.18)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="training" name="Training %" stroke="#842751" fill="url(#entrepreneurTraining)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="flex min-h-[360px] flex-col">
          <CardHeader
            title="Activity feed"
            description="The latest updates from BID and your programme work"
            actions={<Badge tone="brand">Live</Badge>}
          />
          <div className="flex flex-1 flex-col justify-center">
            {recentActivity.map((a) => (
              <div
                key={a.id}
                className="flex gap-3 border-b border-line py-3 last:border-b-0"
              >
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${accentDot[a.accent]}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-relaxed text-ink">
                    {a.text}
                    {a.emphasis && (
                      <strong>
                        {a.id === 'act-3'
                          ? `${a.emphasis} due in 3 days`
                          : a.emphasis}
                      </strong>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-xs text-ink-faint">
                    {a.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
        <Card className="flex flex-col">
          <CardHeader
            title="Upcoming sessions"
            description="Your next support moments and due dates"
            actions={
              <Link href={routes.entrepreneur.schedule}>
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          <div className="grid gap-2">
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
                  <div className="flex items-center gap-1.5 font-mono text-xs text-ink-muted">
                    <Clock3 className="h-3.5 w-3.5" />
                    {new Date(s.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {s.startTime ? ` · ${s.startTime}` : ''}
                  </div>
                  <div className="mt-1 text-sm font-medium">{s.title}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Active deliverables"
            description="Open submissions and items waiting for your attention"
            actions={
              <Link href={routes.entrepreneur.deliverables}>
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          <div className="flex flex-col gap-2">
            {activeDeliverables.map((deliverable) => (
              <div
                key={deliverable.id}
                className="flex items-center gap-3 rounded-md border border-line bg-surface-subtle px-3 py-2.5"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-bid shadow-sm">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{deliverable.name}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {deliverable.groupLabel}
                    {deliverable.dueDate
                      ? ` · Due ${new Date(deliverable.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}`
                      : ''}
                  </div>
                </div>
                <Badge tone={deliverable.status === 'overdue' ? 'red' : deliverable.status === 'submitted' ? 'blue' : 'amber'}>
                  {deliverable.status === 'pending' ? 'Due' : deliverable.status.replace('-', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <BookingModal open={bookOpen} onOpenChange={setBookOpen} />
    </>
  );
}
