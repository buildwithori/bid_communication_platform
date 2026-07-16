"use client";

import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
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
} from "recharts";
import { TrainerDashboardSkeleton } from "@/components/dashboard/DashboardSkeletons";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader } from "@/components/shared/Card";
import { ChartCard } from "@/components/shared/ChartCard";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { useTrainerDashboardQuery, type TrainerDashboard } from "@/lib/api/dashboards";
import { routes } from "@/lib/routes";

const chartColors = ["#842751", "#185FA5", "#1D9E75", "#BA7517"];
const reviewMeta = {
  pending: { label: "Pending", color: "#BA7517", legend: "bg-warning" },
  changes_requested: { label: "Changes", color: "#185FA5", legend: "bg-info" },
  approved: { label: "Approved", color: "#1D9E75", legend: "bg-success" },
  overdue: { label: "Overdue", color: "#842751", legend: "bg-bid" },
} as const;

export default function TrainerDashboardPage() {
  const dashboard = useTrainerDashboardQuery();
  if (dashboard.isLoading && !dashboard.data) return <TrainerDashboardSkeleton />;
  if (dashboard.isError || !dashboard.data) {
    return (
      <>
        <PageHeader title="Trainer dashboard" description="Learner progress, content impact, sessions, and review workload." />
        <Notice className="border border-danger/20 bg-danger/5 text-danger">
          Dashboard data could not be loaded. {dashboard.error?.message}
          <Button className="ml-3" size="sm" variant="outline" onClick={() => dashboard.refetch()}>Try again</Button>
        </Notice>
      </>
    );
  }
  const data: TrainerDashboard = dashboard.data;
  const reviewRows = data.reviewWorkload.map((item) => ({ ...item, name: reviewMeta[item.status].label, fill: reviewMeta[item.status].color }));

  return (
    <>
      <PageHeader title={`Welcome back, ${data.trainer.name}`} description="Track learner progress, content impact, sessions, and review workload from one place." />
      <MetricGrid columns={4}>
        <StatCard label="Learners reached" value={data.metrics.learnersReached} subline={`${data.metrics.learnersNeedingAttention} need attention`} dotColor="bid" accent="bid" />
        <StatCard label="Upcoming sessions" value={data.metrics.upcomingSessions} subline="Next three shown below" dotColor="info" accent="info" />
        <StatCard label="Pending reviews" value={data.metrics.pendingReviews} subline={`${data.metrics.changesRequested} changes requested`} dotColor="warning" accent="warning" />
        <StatCard label="Content rating" value={data.metrics.ratingCount ? `${data.metrics.contentRating.toFixed(1)}/5` : "—"} subline={`${data.metrics.ratingCount} ratings across ${data.metrics.ownedContent} items`} dotColor="success" accent="success" />
      </MetricGrid>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <ChartCard title="Learner progress by programme" description="Average progress for learners reached through your content" legend={[{ label: "Learners", colorClassName: "bg-info" }, { label: "Average progress %", colorClassName: "bg-bid" }]} className="min-h-[380px]" bodyClassName="h-[270px]">
          {data.programmeProgressPreview.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.programmeProgressPreview} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
                <XAxis dataKey="name" tickFormatter={shortLabel} tickLine={false} axisLine={false} tick={{ fill: "#666", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#666", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)" }} />
                <Bar dataKey="learners" name="Learners" fill="#185FA5" radius={[8, 8, 0, 0]} />
                <Bar dataKey="averageProgress" name="Average progress %" fill="#842751" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty label="Your content is not attached to a published programme yet." />}
        </ChartCard>

        <ChartCard title="Learner progress mix" description="Current progress bands across learners in your scope" legend={data.progressBands.map((band, index) => ({ label: band.name, colorClassName: ["bg-bid", "bg-info", "bg-success", "bg-warning"][index] }))} className="min-h-[380px]" bodyClassName="h-[270px]">
          {data.metrics.learnersReached ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <text x="50%" y="47%" textAnchor="middle" className="fill-ink text-3xl font-semibold">{data.metrics.learnersReached}</text>
                <text x="50%" y="56%" textAnchor="middle" className="fill-ink-muted text-sm">Learners</text>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)" }} />
                <Pie data={data.progressBands} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                  {data.progressBands.map((band, index) => <Cell key={band.name} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : <ChartEmpty label="Learner progress appears after entrepreneurs engage with your programme content." />}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Content impact trend" description="Weekly completions across content you own" legend={[{ label: "Content completions", colorClassName: "bg-bid" }]} bodyClassName="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.contentImpactTrend} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
              <defs><linearGradient id="trainerContentCompletions" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#842751" stopOpacity={0.28} /><stop offset="95%" stopColor="#842751" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatWeek} tickLine={false} axisLine={false} tick={{ fill: "#666", fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#666", fontSize: 12 }} />
              <Tooltip labelFormatter={(value) => formatWeek(String(value))} contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)" }} />
              <Area type="monotone" dataKey="completions" name="Content completions" stroke="#842751" fill="url(#trainerContentCompletions)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Review workload" description="Current deliverable states for learners in your content scope" legend={reviewRows.map((item) => ({ label: item.name, colorClassName: reviewMeta[item.status].legend }))} bodyClassName="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reviewRows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#666", fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#666", fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)" }} />
              <Bar dataKey="value" name="Deliverables" radius={[8, 8, 0, 0]}>{reviewRows.map((item) => <Cell key={item.status} fill={item.fill} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader title="Next sessions" description="Upcoming support moments in your session queue" actions={<Link href={routes.trainer.sessions}><Button variant="outline" size="sm">View all</Button></Link>} />
        <div className="grid gap-3 lg:grid-cols-3">
          {data.upcomingSessions.map((session) => (
            <Link key={session.id} href={`${routes.trainer.sessions}?session=${encodeURIComponent(session.id)}`} className="flex min-h-[164px] flex-col rounded-xl border border-line bg-surface-subtle p-4 text-left transition hover:border-bid/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">{sessionTypeLabel(session.type)}</div><div className="mt-2 text-base font-semibold text-ink">{session.topic}</div><div className="mt-1 text-sm text-ink-muted">{session.entrepreneurName}</div></div><Badge tone={session.status === "confirmed" ? "green" : "amber"}>{session.status === "confirmed" ? "Confirmed" : "Awaiting response"}</Badge></div>
              <div className="mt-auto flex flex-wrap gap-3 pt-5 text-sm text-ink-muted"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatDate(session.startsAt)}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{formatTime(session.startsAt, session.timezone)}</span></div>
            </Link>
          ))}
          {!data.upcomingSessions.length && <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted lg:col-span-3">No upcoming sessions in your queue.</div>}
        </div>
      </Card>
    </>
  );
}

function ChartEmpty({ label }: { label: string }) { return <div className="grid h-full place-items-center rounded-lg border border-dashed border-line px-5 text-center text-sm text-ink-muted">{label}</div>; }
function shortLabel(value: string) { return value.length > 18 ? `${value.slice(0, 16)}…` : value; }
function formatWeek(value: string) { return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }); }
function formatDate(value: string) { return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }); }
function formatTime(value: string, timezone: string) { return new Date(value).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", timeZone: timezone }); }
function sessionTypeLabel(value: string) { return value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "); }
