"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BellRing, CalendarPlus, CheckCircle2, Clock3 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { EntrepreneurDashboardSkeleton } from "@/components/dashboard/DashboardSkeletons";
import { BookingModal } from "@/components/entrepreneur/BookingModal";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader } from "@/components/shared/Card";
import { ChartCard, ThemedChartTooltip } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { useEntrepreneurDashboardQuery, type EntrepreneurDashboard } from "@/lib/api/dashboards";
import { routes } from "@/lib/routes";

const severityDot = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  critical: "bg-danger",
} as const;

export default function EntrepreneurDashboardPage() {
  const [bookOpen, setBookOpen] = React.useState(false);
  const dashboard = useEntrepreneurDashboardQuery();
  if (dashboard.isLoading && !dashboard.data) return <EntrepreneurDashboardSkeleton />;
  if (dashboard.isError || !dashboard.data) {
    return (
      <>
        <PageHeader title="Your dashboard" description="Learning, deliverables, and upcoming support." />
        <Notice className="border border-danger/20 bg-danger/5 text-danger">
          Dashboard data could not be loaded. {dashboard.error?.message}
          <Button className="ml-3" size="sm" variant="outline" onClick={() => dashboard.refetch()}>Try again</Button>
        </Notice>
      </>
    );
  }
  const data: EntrepreneurDashboard = dashboard.data;
  const nextSession = data.upcomingSessions[0];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${data.entrepreneur.businessName}`}
        description="Your learning progress, deliverables, and upcoming support in one place."
        actions={<div className="flex flex-wrap gap-2"><Button onClick={() => setBookOpen(true)} variant="outline" className="border border-primary text-primary hover:border-primary hover:bg-accent hover:text-primary"><CalendarPlus className="h-4 w-4" />Book meeting</Button><Link href={routes.entrepreneur.training}><Button>Continue learning<ArrowRight className="h-4 w-4" /></Button></Link></div>}
      />
      <MetricGrid columns={3}>
        <StatCard label="Training progress" value={<>{data.metrics.trainingProgress}<span className="text-[13px] text-ink-muted">%</span></>} subline={`${data.metrics.completedContent} of ${data.metrics.totalContent} items · ${data.metrics.trackedProgrammes} programmes`} dotColor="bid" accent="bid" />
        <StatCard label="Deliverables" value={<>{data.metrics.deliverablesCompleted}<span className="text-[13px] text-ink-muted">/{data.metrics.deliverablesTotal}</span></>} subline={`${data.metrics.deliverablesPending} pending or overdue`} dotColor="warning" accent="warning" />
        <StatCard label="Next session" value={<span className="mt-0.5 text-sm">{nextSession ? formatShortDate(nextSession.startsAt) : "None"}</span>} subline={nextSession?.topic ?? "No upcoming session"} dotColor="info" accent="info" />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <ChartCard
          title="Training progress trend"
          description="Cumulative content completion over the last six weeks"
          legend={[{ label: "Training progress", colorClassName: "bg-bid" }]}
          className="flex min-h-[360px] flex-col"
          bodyClassName="h-auto min-h-[250px] flex-1"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.progressTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <defs><linearGradient id="entrepreneurTraining" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.24} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatChartDate} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <ThemedChartTooltip labelFormatter={(value) => formatChartDate(String(value))} formatter={(value) => [`${value}%`, "Training progress"]} />
              <ReferenceLine y={100} stroke="hsl(var(--primary) / 0.22)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="progress" name="Training %" stroke="hsl(var(--primary))" fill="url(#entrepreneurTraining)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="flex min-h-[360px] flex-col">
          <CardHeader title="Activity feed" description="Latest updates from BID and your programme work" actions={<Badge tone="brand">Live</Badge>} />
          {data.activity.length ? (
            <div className="flex flex-1 flex-col justify-center">
              {data.activity.map((item) => {
                const content = <><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDot[item.severity]}`} /><div className="min-w-0 flex-1"><div className="text-sm font-medium leading-relaxed text-ink">{item.title}</div><div className="mt-0.5 text-sm leading-relaxed text-ink-muted">{item.body}</div><div className="mt-1 font-mono text-xs text-ink-faint">{formatRelative(item.createdAt)}</div></div></>;
                return item.actionUrl ? <Link key={item.id} href={item.actionUrl as Route} className="flex gap-3 border-b border-line py-3 transition hover:text-bid last:border-b-0">{content}</Link> : <div key={item.id} className="flex gap-3 border-b border-line py-3 last:border-b-0">{content}</div>;
              })}
            </div>
          ) : (
            <EmptyState
              className="min-h-[240px] flex-1"
              icon={<BellRing className="h-5 w-5" />}
              title="No activity yet"
              description="Programme updates, review decisions, session changes, and other BID activity will appear here automatically."
            />
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
        <Card className="flex flex-col">
          <CardHeader title="Upcoming sessions" description="Your next support moments" actions={<Link href={routes.entrepreneur.schedule}><Button variant="outline" size="sm">View all</Button></Link>} />
          <div className="grid gap-2">
            {data.upcomingSessions.map((session) => (
              <Link key={session.id} href={`${routes.entrepreneur.schedule}?sessionId=${encodeURIComponent(session.id)}`} className={`rounded-md border-l-[3px] ${session.status === "confirmed" ? "border-l-info" : "border-l-warning"} bg-surface-subtle px-3 py-2 transition hover:bg-bid-light`}>
                <div className="flex items-center gap-1.5 font-mono text-xs text-ink-muted"><Clock3 className="h-3.5 w-3.5" />{formatSessionDate(session.startsAt, session.timezone)} · {formatSessionTime(session.startsAt, session.timezone)}</div>
                <div className="mt-1 flex items-center justify-between gap-3 text-sm font-medium"><span>{session.topic}</span><Badge tone={session.status === "confirmed" ? "green" : "amber"}>{session.status === "confirmed" ? "Confirmed" : "Requested"}</Badge></div>
              </Link>
            ))}
            {!data.upcomingSessions.length && <div className="rounded-lg border border-dashed border-line px-3 py-7 text-center text-sm text-ink-muted">No upcoming sessions. Use “Book meeting” when you need support.</div>}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Active deliverables" description="Open submissions and items waiting for your attention" actions={<Link href={routes.entrepreneur.deliverables}><Button variant="outline" size="sm">View all</Button></Link>} />
          <div className="flex flex-col gap-2">
            {data.activeDeliverables.map((deliverable) => (
              <Link key={deliverable.id} href={routes.entrepreneur.deliverableDetail(deliverable.programmeId, deliverable.id, deliverable.name)} className="flex items-center gap-3 rounded-md border border-line bg-surface-subtle px-3 py-2.5 transition hover:border-bid/20 hover:bg-bid-light">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card text-bid shadow-sm"><CheckCircle2 className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{deliverable.name}</div><div className="mt-0.5 text-xs text-ink-muted">{deliverable.programmeName} · Due {formatShortDate(deliverable.dueDate)}</div></div>
                <Badge tone={deliverableTone(deliverable.status)}>{deliverableLabel(deliverable.status)}</Badge>
              </Link>
            ))}
            {!data.activeDeliverables.length && <div className="rounded-lg border border-dashed border-line px-3 py-7 text-center text-sm text-ink-muted">You have no active deliverables.</div>}
          </div>
        </Card>
      </div>
      <BookingModal open={bookOpen} onOpenChange={setBookOpen} />
    </>
  );
}

function formatShortDate(value: string) { return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" }); }
function formatChartDate(value: string) { return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }); }
function formatSessionDate(value: string, timezone: string) { return new Date(value).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", timeZone: timezone }); }
function formatSessionTime(value: string, timezone: string) { return new Date(value).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", timeZone: timezone }); }
function formatRelative(value: string) { const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000)); if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes} minutes ago`; const hours = Math.round(minutes / 60); if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`; const days = Math.round(hours / 24); return `${days} day${days === 1 ? "" : "s"} ago`; }
function deliverableTone(status: string): "red" | "blue" | "amber" { return status === "overdue" ? "red" : status === "submitted" ? "blue" : "amber"; }
function deliverableLabel(status: string) { return status === "not_submitted" ? "Due" : status === "changes_required" ? "Changes required" : status[0]?.toUpperCase() + status.slice(1); }
