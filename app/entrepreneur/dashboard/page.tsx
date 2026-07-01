'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarPlus } from 'lucide-react';
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
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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

export default function EntrepreneurDashboardPage() {
  const { entrepreneur, sessions, deliverables } = useEntrepreneurStore();
  const [bookOpen, setBookOpen] = React.useState(false);
  const greeting = `Good morning, ${entrepreneur.businessName}`;
  const upcoming = sessions.slice(0, 3);
  const goalAmount = entrepreneur.goal.amountUsd ?? 0;
  const goalProgress = goalAmount
    ? Math.min(Math.round((entrepreneur.metrics.fundsMobilisedUsd / goalAmount) * 100), 100)
    : entrepreneur.metrics.trainingProgress;
  const pendingDeliverables = deliverables.filter((d) => d.status === 'pending' || d.status === 'overdue').length;
  const submittedDeliverables = deliverables.filter((d) => d.status === 'submitted' || d.status === 'reviewed').length;
  const progressTrend = [
    { week: 'W1', training: 32, deliverables: 1 },
    { week: 'W2', training: 44, deliverables: 2 },
    { week: 'W3', training: 57, deliverables: 3 },
    { week: 'W4', training: entrepreneur.metrics.trainingProgress, deliverables: entrepreneur.metrics.deliverablesDone },
  ];
  const workloadData = [
    { name: 'Submitted', value: submittedDeliverables },
    { name: 'Pending', value: pendingDeliverables },
    { name: 'Sessions', value: upcoming.length },
  ];
  const goalData = [
    { name: 'Mobilised', value: goalProgress },
    { name: 'Remaining', value: Math.max(100 - goalProgress, 0) },
  ];

  return (
    <>
      <PageHeader
        title={greeting}
        description="Your learning, deliverables, funding goal, and upcoming support in one place."
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

      <MetricGrid>
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
          value={<span className="mt-0.5 text-sm">Apr 14</span>}
          subline="Mentor check-in"
          dotColor="info"
          accent="info"
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
          accent="success"
        />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <ChartCard
          title="Progress momentum"
          description="Your training and submission pace across the month"
          legend={[
            { label: 'Training progress', colorClassName: 'bg-bid' },
            { label: 'Deliverables completed', colorClassName: 'bg-info' },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={progressTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="entrepreneurTraining" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#842751" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#842751" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="entrepreneurDeliverables" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#185FA5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#185FA5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="training" name="Training %" stroke="#842751" fill="url(#entrepreneurTraining)" strokeWidth={3} />
              <Area type="monotone" dataKey="deliverables" name="Deliverables" stroke="#185FA5" fill="url(#entrepreneurDeliverables)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Funding goal"
          description={`$${Math.round(entrepreneur.metrics.fundsMobilisedUsd / 1000)}k of $${Math.round(goalAmount / 1000)}k mobilised`}
        >
          <div className="relative h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={goalData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} startAngle={90} endAngle={-270}>
                  <Cell fill="#842751" />
                  <Cell fill="#f1efe8" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-semibold tracking-[-0.02em]">{goalProgress}%</div>
                <div className="text-sm text-ink-muted">complete</div>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <ChartCard
          title="Weekly workload"
          description="What needs attention before the next review"
          legend={[
            { label: 'Completed work', colorClassName: 'bg-success' },
            { label: 'Open work', colorClassName: 'bg-warning' },
            { label: 'Sessions', colorClassName: 'bg-info' },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadData} layout="vertical" margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={88} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(132,39,81,0.06)' }} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {workloadData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.name === 'Submitted' ? '#1D9E75' : entry.name === 'Pending' ? '#BA7517' : '#185FA5'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader
            title="Recent activity"
            description="Updates from BID, deliverables, and learning progress"
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
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader
            title="Upcoming sessions"
            description="Your next support moments and deadlines"
            actions={
              <Link href={routes.entrepreneur.schedule}>
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
    </>
  );
}
