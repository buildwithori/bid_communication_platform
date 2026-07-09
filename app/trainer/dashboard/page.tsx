'use client';

import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { ChartCard } from '@/components/shared/ChartCard';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { contentItems, modulesForProgram, programById, programs } from '@/lib/mock-data/programs';
import { trainerById } from '@/lib/mock-data/trainers';
import { getDaysWithoutPeriodicReport } from '@/lib/reporting/overdue-updates';
import { useCompanyConfigStore } from '@/lib/stores/company-config-store';
import { getEntrepreneurProgrammes } from '@/lib/programme-access';
import { getTrainerContentItems, trainerSupportsEntrepreneur } from '@/lib/content-trainer-access';
import {
  adminSessions,
  deliverableReviews,
  type AdminSessionStatus,
} from '@/lib/mock-data/admin-workflows';
import type { Entrepreneur } from '@/types';
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

const currentTrainerId = 't-kofi';
const today = new Date('2026-07-07');
const chartColors = ['#842751', '#185FA5', '#1D9E75', '#BA7517'];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isNeedsAttention(entrepreneur: Entrepreneur, overdueAfterDays: number) {
  const updateAge = getDaysWithoutPeriodicReport(entrepreneur, today);
  return entrepreneur.metrics.trainingProgress < 50 || updateAge > overdueAfterDays;
}

function sessionStatusLabel(status: AdminSessionStatus) {
  return status === 'confirmed' ? 'Confirmed' : 'Awaiting trainer';
}

export default function TrainerDashboardPage() {
  const trainer = trainerById(currentTrainerId);
  const { companyConfig } = useCompanyConfigStore();
  const overdueAfterDays = companyConfig.reporting.periodicUpdateOverdueAfterDays;
  const [sessionPage, setSessionPage] = React.useState(1);

  const supportedLearners = React.useMemo(
    () => entrepreneurs.filter((entrepreneur) => trainerSupportsEntrepreneur(currentTrainerId, entrepreneur)),
    [],
  );
  const supportedIds = React.useMemo(
    () => new Set(supportedLearners.map((entrepreneur) => entrepreneur.id)),
    [supportedLearners],
  );
  const trainerContent = React.useMemo(() => getTrainerContentItems(currentTrainerId), []);
  const trainerSessions = React.useMemo(
    () =>
      adminSessions
        .filter((session) => session.trainerId === currentTrainerId || session.trainerName === trainer?.fullName)
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [trainer?.fullName],
  );
  const upcomingSessions = React.useMemo(
    () => trainerSessions.filter((session) => session.date >= '2026-07-07'),
    [trainerSessions],
  );
  const reviewQueue = React.useMemo(
    () => deliverableReviews.filter((review) => supportedIds.has(review.entrepreneurId)),
    [supportedIds],
  );

  const pendingReviews = reviewQueue.filter((review) => review.status === 'pending-review').length;
  const changesRequested = reviewQueue.filter((review) => review.status === 'changes-requested').length;
  const attentionList = supportedLearners.filter((entrepreneur) =>
    isNeedsAttention(entrepreneur, overdueAfterDays),
  );
  const avgTraining = Math.round(
    supportedLearners.reduce((sum, entrepreneur) => sum + entrepreneur.metrics.trainingProgress, 0) /
      Math.max(supportedLearners.length, 1),
  );
  const avgRating = trainer?.metrics.satisfactionAvg ?? 0;

  const visibleSessionCount = 3;
  const visibleSessions = React.useMemo(() => {
    const start = (sessionPage - 1) * visibleSessionCount;
    return upcomingSessions.slice(start, start + visibleSessionCount);
  }, [sessionPage, upcomingSessions]);

  const programmeProgress = React.useMemo(() => {
    return Object.values(
      supportedLearners.reduce<Record<string, { name: string; learners: number; avgProgress: number; progressTotal: number }>>((acc, entrepreneur) => {
        const learnerProgrammes = getEntrepreneurProgrammes(entrepreneur).filter((programme) => programme.accessType !== 'free');
        const programmeIds = learnerProgrammes.length > 0 ? learnerProgrammes.map((programme) => programme.id) : ['free-resources'];

        programmeIds.forEach((id) => {
          const programme = id === 'free-resources' ? null : programById(id);
          const key = programme?.id ?? 'free-resources';
          const current = acc[key] ?? {
            name: programme?.name.replace('BID ', '') ?? 'Free resources',
            learners: 0,
            avgProgress: 0,
            progressTotal: 0,
          };
          current.learners += 1;
          current.progressTotal += entrepreneur.metrics.trainingProgress;
          current.avgProgress = Math.round(current.progressTotal / current.learners);
          acc[key] = current;
        });
        return acc;
      }, {}),
    );
  }, [supportedLearners]);

  const progressBands = React.useMemo(() => {
    const bands = [
      { name: '0-25%', value: 0 },
      { name: '26-50%', value: 0 },
      { name: '51-75%', value: 0 },
      { name: '76-100%', value: 0 },
    ];
    supportedLearners.forEach((learner) => {
      const progress = learner.metrics.trainingProgress;
      if (progress <= 25) bands[0].value += 1;
      else if (progress <= 50) bands[1].value += 1;
      else if (progress <= 75) bands[2].value += 1;
      else bands[3].value += 1;
    });
    return bands;
  }, [supportedLearners]);

  const reviewStatusData = React.useMemo(() => ([
    { name: 'Pending', value: pendingReviews, fill: '#BA7517' },
    { name: 'Changes', value: changesRequested, fill: '#185FA5' },
    { name: 'Approved', value: reviewQueue.filter((review) => review.status === 'approved').length, fill: '#1D9E75' },
    { name: 'Late', value: reviewQueue.filter((review) => review.status === 'pending-review' && review.dueAt < '2026-07-07').length, fill: '#842751' },
  ]), [changesRequested, pendingReviews, reviewQueue]);

  const contentImpactTrend = React.useMemo(() => {
    const ownedContentIds = new Set(trainerContent.map((item) => item.id));
    const ownedModules = programs.flatMap((programme) =>
      modulesForProgram(programme.id).filter((module) =>
        module.contentItemIds.some((contentId) => ownedContentIds.has(contentId)),
      ),
    );
    const moduleCount = Math.max(new Set(ownedModules.map((module) => module.id)).size, 1);
    const completedContent = trainerContent.filter((item) => item.progress === 'completed').length;
    const inProgressContent = trainerContent.filter((item) => item.progress === 'in-progress').length;

    return [
      { date: 'Jul 1', completions: Math.max(completedContent - 3, 0), rating: Math.max(avgRating - 0.2, 0), modules: moduleCount },
      { date: 'Jul 3', completions: Math.max(completedContent - 2, 0), rating: Math.max(avgRating - 0.1, 0), modules: moduleCount },
      { date: 'Jul 5', completions: completedContent + inProgressContent, rating: avgRating, modules: moduleCount },
      { date: 'Jul 7', completions: completedContent + inProgressContent + 1, rating: avgRating, modules: moduleCount },
    ];
  }, [avgRating, trainerContent]);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${trainer?.fullName ?? 'Trainer'}`}
        description="Track learner progress, content impact, sessions, and review workload from one place."
      />

      <MetricGrid columns={4}>
        <StatCard label="Learners reached" value={supportedLearners.length} subline={`${attentionList.length} need attention`} dotColor="bid" accent="bid" />
        <StatCard label="Upcoming sessions" value={upcomingSessions.length} subline="On your calendar" dotColor="info" accent="info" />
        <StatCard label="Pending reviews" value={pendingReviews} subline={`${changesRequested} changes requested`} dotColor="warning" accent="warning" />
        <StatCard label="Content rating" value={avgRating ? `${avgRating.toFixed(1)}/5` : '—'} subline={`${trainer?.metrics.satisfactionRatingsCount ?? 0} ratings received`} dotColor="success" accent="success" />
      </MetricGrid>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <ChartCard
          title="Learner progress by programme"
          description="Average training progress from learners reached through your content"
          legend={[
            { label: 'Learners', colorClassName: 'bg-info' },
            { label: 'Average progress %', colorClassName: 'bg-bid' },
          ]}
          className="min-h-[380px]"
          bodyClassName="h-[270px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={programmeProgress} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(132,39,81,0.06)' }} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              <Bar dataKey="learners" name="Learners" fill="#185FA5" radius={[8, 8, 0, 0]} />
              <Bar dataKey="avgProgress" name="Average progress %" fill="#842751" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Learner progress mix"
          description="Where learners currently sit across progress bands"
          legend={progressBands.map((band, index) => ({ label: band.name, colorClassName: ['bg-bid', 'bg-info', 'bg-success', 'bg-warning'][index] }))}
          className="min-h-[380px]"
          bodyClassName="h-[270px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <text x="50%" y="47%" textAnchor="middle" className="fill-ink text-3xl font-semibold">
                {supportedLearners.length}
              </text>
              <text x="50%" y="56%" textAnchor="middle" className="fill-ink-muted text-sm">
                Learners
              </text>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              <Pie data={progressBands} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                {progressBands.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard
          title="Content impact trend"
          description="Completion movement across the content you own"
          legend={[
            { label: 'Content completions', colorClassName: 'bg-bid' },
            { label: 'Rating', colorClassName: 'bg-success' },
          ]}
          bodyClassName="h-[240px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={contentImpactTrend} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="trainerContentCompletions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#842751" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#842751" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="completions" name="Content completions" stroke="#842751" fill="url(#trainerContentCompletions)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Review workload"
          description="Deliverable review status for learners reached through your content"
          legend={reviewStatusData.map((item) => ({ label: item.name, colorClassName: item.name === 'Pending' ? 'bg-warning' : item.name === 'Changes' ? 'bg-info' : item.name === 'Approved' ? 'bg-success' : 'bg-bid' }))}
          bodyClassName="h-[240px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reviewStatusData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(132,39,81,0.06)' }} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" name="Reviews" radius={[8, 8, 0, 0]}>
                {reviewStatusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardHeader
            title="Next sessions"
            description="Upcoming support moments in your session queue"
            className="mb-0"
          />
          <DashboardPager
            page={sessionPage}
            pageSize={visibleSessionCount}
            totalItems={upcomingSessions.length}
            onPageChange={setSessionPage}
          />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {visibleSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className="flex min-h-[164px] flex-col rounded-xl border border-line bg-surface-subtle p-4 text-left transition hover:border-bid/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">
                    {session.sessionType}
                  </div>
                  <div className="mt-2 text-base font-semibold text-ink">{session.topic}</div>
                  <div className="mt-1 text-sm text-ink-muted">{session.entrepreneurName}</div>
                </div>
                <Badge tone={session.status === 'confirmed' ? 'green' : 'amber'}>
                  {sessionStatusLabel(session.status)}
                </Badge>
              </div>
              <div className="mt-auto flex flex-wrap gap-3 pt-5 text-sm text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(session.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {session.startTime}
                  {session.endTime ? `-${session.endTime}` : ''}
                </span>
              </div>
            </button>
          ))}
          {upcomingSessions.length === 0 && (
            <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted lg:col-span-3">
              No upcoming sessions in this trainer queue.
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

function DashboardPager({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex shrink-0 items-center gap-2 text-sm text-ink-muted">
      <span className="hidden sm:inline">
        Showing <span className="font-medium text-ink">{start}-{end}</span> of{' '}
        <span className="font-medium text-ink">{totalItems}</span>
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous items"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next items"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
