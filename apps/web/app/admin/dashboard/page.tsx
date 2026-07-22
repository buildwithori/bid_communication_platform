"use client";

import { useDebouncedValue } from '@/lib/search';
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminDashboardSkeleton } from "@/components/dashboard/DashboardSkeletons";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader } from "@/components/shared/Card";
import { ChartCard } from "@/components/shared/ChartCard";
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import {
  useAdminDashboardQuery,
  useAdminRecentEntrepreneursPage,
  type AdminDashboard,
  type DashboardRecentEntrepreneur,
} from "@/lib/api/dashboards";
import { routes } from "@/lib/routes";

const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const sourceOptions = [
  { value: "all", label: "All sources" },
  { value: "admin_invited", label: "Admin-invited" },
  { value: "self_registered", label: "Self-registered" },
];
const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active accounts" },
  { value: "without_programme", label: "Without programme" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const dashboard = useAdminDashboardQuery();
  const [search, setSearch] = React.useState("");
  const [source, setSource] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [pageSize, setPageSize] = React.useState(5);
  const debouncedSearch = useDebouncedValue(search);
  const recent = useAdminRecentEntrepreneursPage({
    search: debouncedSearch.trim() || undefined,
    source: source === "all" ? undefined : source as DashboardRecentEntrepreneur["source"],
    status: status === "all" ? undefined : status as "active" | "without_programme",
    take: pageSize,
  });

  const resetRecentPagination = recent.resetPagination;
  React.useEffect(() => {
    resetRecentPagination();
  }, [debouncedSearch, pageSize, resetRecentPagination, source, status]);

  if (dashboard.isLoading && !dashboard.data) return <AdminDashboardSkeleton />;
  if (dashboard.isError || !dashboard.data) {
    return (
      <>
        <PageHeader title="Platform overview" description="Live data across all programmes" />
        <Notice className="border border-danger/20 bg-danger/5 text-danger">
          Dashboard data could not be loaded. {dashboard.error?.message}
          <Button className="ml-3" size="sm" variant="outline" onClick={() => dashboard.refetch()}>
            Try again
          </Button>
        </Notice>
      </>
    );
  }

  const data: AdminDashboard = dashboard.data;
  const programmeLeft = data.programmeHealthPreview.reduce((sum, item) => sum + item.left, 0);
  const retention = data.programmeHealthPreview.length
    ? Math.round(data.programmeHealthPreview.reduce((sum, item) => sum + item.retention, 0) / data.programmeHealthPreview.length)
    : 0;
  const openEntrepreneur = (id: string, mode = "entrepreneur") =>
    router.push(`${routes.admin.entrepreneurs}?${mode}=${encodeURIComponent(id)}`);
  const columns: Column<DashboardRecentEntrepreneur>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-[84px]",
      cell: (record) => (
        <RowActions actions={[
          { label: "View profile", onSelect: () => openEntrepreneur(record.entrepreneurUserId) },
          ...(!record.hasProgramme
            ? [{ label: "Manage programmes", onSelect: () => openEntrepreneur(record.entrepreneurUserId, "programme") }]
            : []),
        ]} />
      ),
    },
    {
      key: "business",
      header: "Business",
      cell: (record) => (
        <button type="button" onClick={() => openEntrepreneur(record.entrepreneurUserId)} className="min-w-[190px] text-left font-semibold text-ink hover:text-bid">
          {record.businessName}
          <span className="mt-0.5 block font-normal text-ink-muted">{record.email}</span>
        </button>
      ),
    },
    { key: "representative", header: "Representative", cell: (record) => record.representativeName },
    { key: "sector", header: "Sector", cell: (record) => record.sector?.name ?? <span className="text-ink-faint">Not set</span> },
    { key: "stage", header: "Stage", cell: (record) => record.stage?.name ?? <span className="text-ink-faint">Not set</span> },
    {
      key: "source",
      header: "Source",
      cell: (record) => <Badge tone={record.source === "admin_invited" ? "brand" : "neutral"}>{record.source === "admin_invited" ? "Admin-invited" : "Self-registered"}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      cell: (record) => record.userStatus === "pending"
        ? <Badge tone="amber">Invitation pending</Badge>
        : !record.hasProgramme
          ? <Badge tone="red">Without programme</Badge>
          : <Badge tone="green">Active</Badge>,
    },
  ];
  const pendingActions = [
    { label: "Deliverables awaiting review", count: data.pendingActions.deliverablesAwaitingReview, tone: "amber" as const, href: routes.admin.deliverableReviews },
    { label: "Self-registered without programme", count: data.pendingActions.selfRegisteredWithoutProgramme, tone: "red" as const, href: routes.admin.entrepreneurs },
    { label: "Tool requests under review", count: data.pendingActions.toolRequestsUnderReview, tone: "blue" as const, href: routes.admin.toolRequests },
  ];

  return (
    <>
      <PageHeader title="Platform overview" description="Live operational data across all programmes" />
      <MetricGrid>
        <StatCard label="Total entrepreneurs" value={data.metrics.totalEntrepreneurs} subline={`${data.metrics.activeProgrammes} active programmes`} dotColor="bid" accent="bid" />
        <StatCard label="Funds mobilised" value={formatMoney(data.metrics.fundsMobilisedCents, data.currency, true)} subline={`Reported in ${data.currency}`} dotColor="info" accent="info" />
        <StatCard label="Avg. training progress" value={`${data.metrics.averageTrainingProgress}%`} subline={`${data.metrics.trackedProgrammeProgress} tracked programme records`} dotColor="success" accent="success" />
        <StatCard label="Without programme" value={data.metrics.withoutProgramme} subline="Needs programme access" dotColor="warning" valueClassName="text-bid" accent="warning" />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <ChartCard title="Programme health" description={`${programmeLeft} left across this active-programme preview · ${retention}% average retention`} legend={[
          { label: "Active participants", colorClassName: "bg-info" },
          { label: "Left programme", colorClassName: "bg-warning" },
          { label: "Open seats", colorClassName: "bg-ink-muted" },
          { label: "Completion %", colorClassName: "bg-bid" },
        ]}>
          {data.programmeHealthPreview.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.programmeHealthPreview} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={shortLabel} />
                <YAxis yAxisId="count" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }} />
                <Bar yAxisId="count" dataKey="active" name="Active participants" stackId="people" fill="hsl(var(--chart-2))" />
                <Bar yAxisId="count" dataKey="left" name="Left programme" stackId="people" fill="hsl(var(--chart-4))" />
                <Bar yAxisId="count" dataKey="openSeats" name="Open seats" stackId="people" fill="hsl(var(--chart-5))" radius={[8, 8, 0, 0]} />
                <Line yAxisId="percent" type="monotone" dataKey="completion" name="Completion %" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--chart-1))" }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <ChartEmpty label="No active programme data yet." />}
        </ChartCard>

        <ChartCard title="Sector mix" description="Active businesses by sector" legend={data.sectorBreakdown.slice(0, 5).map((item, index) => ({ label: `${item.name} (${item.value})`, colorClassName: ["bg-bid", "bg-info", "bg-success", "bg-warning", "bg-ink-muted"][index] ?? "bg-line" }))}>
          {data.sectorBreakdown.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-ink text-3xl font-semibold">{data.metrics.activeBusinesses}</text>
                <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-ink-muted text-xs">Active businesses</text>
                <Pie data={data.sectorBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>
                  {data.sectorBreakdown.map((item, index) => <Cell key={item.id} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <ChartEmpty label="No sector data yet." />}
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr]">
        <ChartCard title="Funds momentum" description={`${formatMoney(data.metrics.fundsMobilisedCents, data.currency)} mobilised in ${data.currency}`} legend={[{ label: `Funds mobilised (${data.currency})`, colorClassName: "bg-bid" }]} className="min-h-[430px]" bodyClassName="h-auto">
          <div className="h-[185px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.fundsTrend.map((item) => ({ ...item, amount: item.amountCents / 100 }))} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tickFormatter={(value) => formatMonth(String(value))} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip labelFormatter={(value) => formatMonth(String(value))} formatter={(value) => formatMoney(Number(value) * 100, data.currency)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }} />
                <Bar dataKey="amount" name="Funds mobilised" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <div className="mb-3 flex items-center justify-between"><div className="text-sm font-semibold text-ink">Top entrepreneurs</div><div className="text-sm text-ink-muted">By funds mobilised</div></div>
            <div className="grid gap-2">
              {data.topFundraisers.map((item, index) => (
                <button key={item.entrepreneurUserId} type="button" onClick={() => openEntrepreneur(item.entrepreneurUserId)} className="flex items-center justify-between rounded-lg bg-surface-subtle px-3 py-2 text-left transition hover:bg-bid-light">
                  <span className="flex min-w-0 items-center gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card text-xs font-semibold text-bid">{index + 1}</span><span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{item.businessName}</span><span className="block text-xs text-ink-muted">{item.sectorName}</span></span></span>
                  <span className="shrink-0 text-sm font-semibold text-ink">{formatMoney(item.amountCents, data.currency, true)}</span>
                </button>
              ))}
              {!data.topFundraisers.length && <div className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-ink-muted">No fundraising rounds reported in {data.currency} yet.</div>}
            </div>
          </div>
        </ChartCard>

        <Card>
          <CardHeader title="Stage movement" description="Current maturity across active businesses" />
          <div className="grid gap-3">
            {data.stageBreakdown.map((item, index) => (
              <div key={item.id} className="rounded-xl bg-surface-subtle p-4">
                <div className="mb-2 flex items-center justify-between gap-3"><span className="font-medium">{item.name}</span><span className="text-sm text-ink-muted">{item.value} businesses</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-panel"><div className={index === 0 ? "h-full rounded-full bg-warning" : index === 1 ? "h-full rounded-full bg-bid" : "h-full rounded-full bg-success"} style={{ width: `${item.percent}%` }} /></div>
              </div>
            ))}
            {!data.stageBreakdown.length && <ChartEmpty label="No business stages have been assigned yet." />}
          </div>
          <div className="my-4 h-px bg-line" />
          <CardHeader title="Pending actions" className="mb-2" />
          <div className="grid gap-2">
            {pendingActions.map((item) => (
              <button key={item.label} type="button" onClick={() => router.push(item.href)} className="flex items-center justify-between rounded-lg bg-surface-subtle px-3 py-2 text-left text-sm transition hover:bg-bid-light hover:text-bid"><span>{item.label}</span><Badge tone={item.tone}>{item.count}</Badge></button>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recently joined" description="New entrepreneurs who may need team attention" actions={<Button size="sm" variant="outline" onClick={() => router.push(routes.admin.entrepreneurs)}>Open directory</Button>} />
        <TableToolbar>
          <div><div className="text-sm font-medium text-ink">Search new joiners</div><div className="mt-0.5 text-sm text-ink-muted">Search names, email, business, sector, or stage.</div></div>
          <div className="grid w-full gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_190px] lg:w-[740px]">
            <TableFilterInput icon placeholder="Search recent joiners..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <TableFilterAutocomplete value={source} onValueChange={setSource} options={sourceOptions} placeholder="All sources" searchPlaceholder="Search sources..." emptyMessage="No source found." />
            <TableFilterAutocomplete value={status} onValueChange={setStatus} options={statusOptions} placeholder="All statuses" searchPlaceholder="Search statuses..." emptyMessage="No status found." />
          </div>
        </TableToolbar>
        {recent.isError ? (
          <Notice className="mb-0 border border-danger/20 bg-danger/5 text-danger">Recent entrepreneurs could not be loaded. <Button className="ml-2" size="sm" variant="outline" onClick={() => recent.refetch()}>Try again</Button></Notice>
        ) : (
          <DataTable columns={columns} rows={recent.rows} rowKey={(record) => record.entrepreneurUserId} emptyMessage={recent.isLoading ? "Loading recent entrepreneurs..." : "No recent entrepreneurs match this view."} />
        )}
        <TablePagination page={recent.page} pageSize={pageSize} totalItems={recent.totalItems} pageSizeOptions={[5, 10, 25]} onPageChange={recent.setPage} onPageSizeChange={(value) => setPageSize(value)} />
      </Card>
    </>
  );
}

function formatMoney(amountCents: number, currency: string, compact = false) {
  return new Intl.NumberFormat("en", { style: "currency", currency, notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 0 }).format(amountCents / 100);
}
function formatMonth(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", year: "2-digit", timeZone: "UTC" });
}
function shortLabel(value: string) {
  return value.length > 18 ? `${value.slice(0, 16)}…` : value;
}
function ChartEmpty({ label }: { label: string }) {
  return <div className="grid h-full place-items-center rounded-lg border border-dashed border-line px-4 text-center text-sm text-ink-muted">{label}</div>;
}
