'use client';

import * as React from 'react';
import { CalendarDays, CheckCircle2, Clock3, FileText, MessageSquareText, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { ChartCard } from '@/components/shared/ChartCard';
import { Badge } from '@/components/shared/Badge';
import { Avatar } from '@/components/shared/Avatar';
import { Button } from '@/components/shared/Button';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { ViewEntrepreneurModal } from '@/components/admin/ViewEntrepreneurModal';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { programById } from '@/lib/mock-data/programs';
import { trainerById } from '@/lib/mock-data/trainers';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import { adminSessions, deliverableReviews } from '@/lib/mock-data/admin-workflows';
import type { Entrepreneur } from '@/types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const currentTrainerId = 't-kofi';
const today = new Date('2026-07-07');

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysSince(value?: string) {
  if (!value) return null;
  return Math.max(Math.floor((today.getTime() - new Date(value).getTime()) / 86_400_000), 0);
}

function isNeedsAttention(entrepreneur: Entrepreneur) {
  const updateAge = daysSince(entrepreneur.lastUpdateAt);
  return entrepreneur.metrics.trainingProgress < 50 || updateAge == null || updateAge > 60;
}

export default function TrainerDashboardPage() {
  const trainer = trainerById(currentTrainerId);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const [viewTarget, setViewTarget] = React.useState<Entrepreneur | null>(null);

  const assignedEntrepreneurs = React.useMemo(
    () => entrepreneurs.filter((entrepreneur) => entrepreneur.trainerId === currentTrainerId),
    [],
  );
  const assignedIds = new Set(assignedEntrepreneurs.map((entrepreneur) => entrepreneur.id));
  const trainerSessions = adminSessions
    .filter((session) => session.trainerId === currentTrainerId || session.trainerName === trainer?.fullName)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  const upcomingSessions = trainerSessions.filter((session) => session.date >= '2026-07-07');
  const reviewQueue = deliverableReviews.filter((review) => assignedIds.has(review.entrepreneurId));
  const pendingReviews = reviewQueue.filter((review) => review.status === 'pending-review').length;
  const changesRequested = reviewQueue.filter((review) => review.status === 'changes-requested').length;
  const attentionList = assignedEntrepreneurs.filter(isNeedsAttention);
  const avgTraining = Math.round(
    assignedEntrepreneurs.reduce((sum, entrepreneur) => sum + entrepreneur.metrics.trainingProgress, 0) /
      Math.max(assignedEntrepreneurs.length, 1),
  );
  const filteredEntrepreneurs = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return assignedEntrepreneurs;
    return assignedEntrepreneurs.filter((entrepreneur) =>
      [
        entrepreneur.businessName,
        entrepreneur.representative,
        entrepreneur.email,
        sectorById[entrepreneur.sector]?.label ?? entrepreneur.sector,
        stageById[entrepreneur.stage]?.label ?? entrepreneur.stage,
        programById(entrepreneur.programmeId)?.name ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [assignedEntrepreneurs, query]);
  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEntrepreneurs.slice(start, start + pageSize);
  }, [filteredEntrepreneurs, page, pageSize]);

  const programmeCoverage = Object.values(
    assignedEntrepreneurs.reduce<Record<string, { name: string; entrepreneurs: number; avgProgress: number; progressTotal: number }>>((acc, entrepreneur) => {
      const programme = programById(entrepreneur.programmeId);
      const key = programme?.id ?? 'unassigned';
      const current = acc[key] ?? {
        name: programme?.name.replace('BID ', '') ?? 'Unassigned',
        entrepreneurs: 0,
        avgProgress: 0,
        progressTotal: 0,
      };
      current.entrepreneurs += 1;
      current.progressTotal += entrepreneur.metrics.trainingProgress;
      current.avgProgress = Math.round(current.progressTotal / current.entrepreneurs);
      acc[key] = current;
      return acc;
    }, {}),
  );

  const entrepreneurColumns: Column<Entrepreneur>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (entrepreneur) => (
        <RowActions actions={[{ label: 'View profile', onSelect: () => setViewTarget(entrepreneur) }]} />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'business',
      header: 'Business',
      cell: (entrepreneur) => (
        <button
          type="button"
          onClick={() => setViewTarget(entrepreneur)}
          className="flex min-w-[240px] items-center gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          <Avatar initials={entrepreneur.initials} size={30} />
          <span className="min-w-0">
            <span className="block font-medium text-ink">{entrepreneur.businessName}</span>
            <span className="mt-1 block text-sm text-ink-muted">{entrepreneur.representative}</span>
          </span>
        </button>
      ),
    },
    {
      key: 'programme',
      header: 'Programme',
      cell: (entrepreneur) => programById(entrepreneur.programmeId)?.name ?? 'Not assigned',
    },
    {
      key: 'progress',
      header: 'Training',
      cell: (entrepreneur) => `${entrepreneur.metrics.trainingProgress}%`,
    },
    {
      key: 'followup',
      header: 'Follow-up',
      cell: (entrepreneur) => {
        const updateAge = daysSince(entrepreneur.lastUpdateAt);
        if (entrepreneur.metrics.trainingProgress < 50) return <Badge tone="amber">Low progress</Badge>;
        if (updateAge == null || updateAge > 60) return <Badge tone="red">Update overdue</Badge>;
        return <Badge tone="green">On track</Badge>;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${trainer?.fullName ?? 'Trainer'}`}
        description="Your assigned entrepreneurs, upcoming sessions, and review work in one place."
      />

      <MetricGrid columns={4}>
        <StatCard label="Assigned entrepreneurs" value={assignedEntrepreneurs.length} subline={`${attentionList.length} need attention`} dotColor="bid" accent="bid" />
        <StatCard label="Upcoming sessions" value={upcomingSessions.length} subline="On your calendar" dotColor="info" accent="info" />
        <StatCard label="Pending reviews" value={pendingReviews} subline={`${changesRequested} changes requested`} dotColor="warning" accent="warning" />
        <StatCard label="Avg. training progress" value={`${avgTraining}%`} subline="Across your portfolio" dotColor="success" accent="success" />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard
          title="Programme coverage"
          description="How your assigned entrepreneurs are progressing by programme"
          legend={[
            { label: 'Assigned entrepreneurs', colorClassName: 'bg-info' },
            { label: 'Average progress %', colorClassName: 'bg-bid' },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={programmeCoverage} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(132,39,81,0.06)' }} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }} />
              <Bar dataKey="entrepreneurs" name="Assigned entrepreneurs" fill="#185FA5" radius={[8, 8, 0, 0]} />
              <Bar dataKey="avgProgress" name="Average progress %" fill="#842751" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader
            title="Trainer workbench"
            description="The core trainer workflow BID needs to support"
          />
          <div className="grid gap-3">
            <FeatureRow icon={Users} title="Coach assigned entrepreneurs" text="Track training progress, business context, and who needs follow-up." />
            <FeatureRow icon={CalendarDays} title="Run sessions" text="See confirmed sessions and requests waiting for trainer confirmation." />
            <FeatureRow icon={MessageSquareText} title="Give feedback" text="Review assigned deliverables and make feedback visible to entrepreneurs." />
            <FeatureRow icon={FileText} title="Use programme context" text="Understand which curriculum and deliverables each entrepreneur is working through." />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader title="Next sessions" description="Upcoming support moments assigned to you" />
          <div className="grid gap-2">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-ink">{session.topic}</div>
                    <div className="mt-1 text-sm text-ink-muted">{session.entrepreneurName}</div>
                  </div>
                  <Badge tone={session.status === 'confirmed' ? 'green' : 'amber'}>
                    {session.status === 'confirmed' ? 'Confirmed' : 'Awaiting trainer'}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(session.date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4" />
                    {session.startTime}{session.endTime ? `-${session.endTime}` : ''}
                  </span>
                </div>
              </div>
            ))}
            {upcomingSessions.length === 0 && (
              <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                No upcoming sessions assigned to this trainer.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Review and feedback queue" description="Deliverables from entrepreneurs assigned to you" />
          <div className="grid gap-2">
            {reviewQueue.map((review) => (
              <div key={review.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-ink">{review.deliverable}</div>
                  <div className="mt-1 text-sm text-ink-muted">{review.businessName} · Submitted {formatDate(review.submittedAt)}</div>
                  {review.latestFeedback && <div className="mt-1 line-clamp-1 text-sm text-ink-muted">{review.latestFeedback}</div>}
                </div>
                <Badge tone={review.status === 'approved' ? 'green' : review.status === 'changes-requested' ? 'blue' : 'amber'}>
                  {review.status === 'pending-review' ? 'Pending review' : review.status === 'changes-requested' ? 'Changes required' : 'Approved'}
                </Badge>
              </div>
            ))}
            {reviewQueue.length === 0 && (
              <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                No deliverables are assigned to this trainer yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="My entrepreneurs"
          description="Assigned portfolio with progress and follow-up status"
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Search assigned entrepreneurs</div>
            <div className="mt-0.5 text-sm text-ink-muted">Find by business, representative, sector, programme, or stage.</div>
          </div>
          <div className="w-full sm:w-[320px]">
            <TableFilterInput
              icon
              placeholder="Search entrepreneurs..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </TableToolbar>
        <DataTable
          columns={entrepreneurColumns}
          rows={pageRows}
          rowKey={(entrepreneur) => entrepreneur.id}
          emptyMessage="No assigned entrepreneurs match this search."
          tableClassName="min-w-[920px]"
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredEntrepreneurs.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      {viewTarget && (
        <ViewEntrepreneurModal
          open={!!viewTarget}
          onOpenChange={(open) => !open && setViewTarget(null)}
          entrepreneur={viewTarget}
        />
      )}
    </>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof CheckCircle2;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-surface-subtle px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-info-light text-info">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-ink-muted">{text}</span>
      </span>
    </div>
  );
}
