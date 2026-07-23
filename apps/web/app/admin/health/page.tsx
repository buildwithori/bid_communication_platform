"use client";

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  HardDrive,
  Mail,
  RefreshCw,
  Video,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { HealthPageSkeleton } from "@/components/health/HealthPageSkeleton";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader } from "@/components/shared/Card";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import {
  useHealthDetailsQuery,
  type HealthConfigurationStatus,
  type HealthDependency,
  type HealthDetails,
  type HealthQueue,
} from "@/lib/api/health";
import { cn } from "@/lib/utils";

const dependencyLabels: Record<string, string> = {
  database: "Database",
  backgroundJobs: "Background jobs",
  objectStorage: "Object storage",
  emailDelivery: "Email delivery",
};

export default function AdminHealthPage() {
  const health = useHealthDetailsQuery();

  if (health.isLoading && !health.data) {
    return <HealthPageSkeleton />;
  }

  if (health.isError || !health.data) {
    return (
      <>
        <PageHeader
          title="System Health"
          description="A private operational view of BID Hub services and background processing."
        />
        <Card className="border-danger/25 bg-danger-light/40">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-danger-light text-danger">
              <CircleAlert className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-ink">
                Health information could not be loaded
              </h3>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                {health.error?.message ??
                  "The operational health endpoint is temporarily unavailable."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void health.refetch()}
              isLoading={health.isFetching}
              loadingLabel="Retrying"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        </Card>
      </>
    );
  }

  const snapshot: HealthDetails = health.data;
  const healthy = snapshot.status === "ok";
  const jobs = snapshot.dependencies.backgroundJobs.details;
  const queues: HealthQueue[] = jobs?.queues ?? [];
  const queueTotals = sumQueueCounts(queues);
  const connectedCount = [
    snapshot.dependencies.database,
    snapshot.dependencies.backgroundJobs,
    snapshot.dependencies.objectStorage,
    snapshot.dependencies.emailDelivery,
  ].filter((dependency) => dependency.status === "connected").length;

  return (
    <div aria-live="polite">
      <PageHeader
        title="System Health"
        description="A private operational view of BID Hub services and background processing."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void health.refetch()}
            isLoading={health.isFetching}
            loadingLabel="Refreshing"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <Card
        className={cn(
          "relative mb-5 overflow-hidden p-0",
          healthy
            ? "border-success/25"
            : "border-danger/30",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-80",
            healthy
              ? "bg-gradient-to-br from-success-light via-card to-info-light/50"
              : "bg-gradient-to-br from-danger-light via-card to-warning-light/50",
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            "pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl",
            healthy ? "bg-success/15" : "bg-danger/15",
          )}
          aria-hidden="true"
        />
        <div className="relative flex min-h-48 flex-col justify-between gap-8 p-6 sm:flex-row sm:items-center lg:p-8">
          <div>
            <Badge tone={healthy ? "green" : "red"} className="gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  healthy ? "bg-success" : "bg-danger",
                )}
              />
              {healthy ? "Operational" : "Attention required"}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink">
              {healthy
                ? "All required services are healthy"
                : `${snapshot.failed.length} service${snapshot.failed.length === 1 ? "" : "s"} need attention`}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
              {healthy
                ? `${connectedCount} of 4 required dependencies responded successfully. BID Hub is ready to serve requests.`
                : `Unavailable: ${snapshot.failed.map((name) => dependencyLabels[name] ?? name).join(", ")}. Healthy services remain visible below.`}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-faint">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                Checked {formatDateTime(snapshot.timestamp)}
              </span>
              <span>Auto-refreshes every 30 seconds</span>
            </div>
          </div>
          <div
            className={cn(
              "flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] shadow-[0_18px_45px_rgba(0,0,0,0.08)]",
              healthy
                ? "border-success-light bg-success text-white"
                : "border-danger-light bg-danger text-white",
            )}
          >
            {healthy ? (
              <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
            ) : (
              <CircleAlert className="h-12 w-12" aria-hidden="true" />
            )}
          </div>
        </div>
      </Card>

      {!healthy ? (
        <Notice className="border border-danger/20 bg-danger-light/45 text-danger-dark">
          The dashboard remains available during a partial outage so you can
          identify the affected dependency and confirm recovery.
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DependencyCard
          title="Database"
          icon={Database}
          dependency={snapshot.dependencies.database}
          description={
            snapshot.dependencies.database.details?.provider === "postgresql"
              ? "PostgreSQL is accepting queries."
              : "Primary application data store."
          }
        />
        <DependencyCard
          title="Background jobs"
          icon={Workflow}
          dependency={snapshot.dependencies.backgroundJobs}
          description={
            jobs?.worker.heartbeatAt
              ? `Worker heartbeat ${formatDateTime(jobs.worker.heartbeatAt)}.`
              : "Redis queues and worker heartbeat."
          }
        />
        <DependencyCard
          title="Object storage"
          icon={HardDrive}
          dependency={snapshot.dependencies.objectStorage}
          description={
            snapshot.dependencies.objectStorage.details
              ? "Private file storage is reachable."
              : "Uploads, downloads, and generated files."
          }
        />
        <DependencyCard
          title="Email delivery"
          icon={Mail}
          dependency={snapshot.dependencies.emailDelivery}
          description={
            snapshot.dependencies.emailDelivery.details?.transport
              ? `${titleCase(snapshot.dependencies.emailDelivery.details.transport)} delivery is configured.`
              : "Transactional email transport."
          }
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader
            title="Background queues"
            description="Current BullMQ workload across operational job queues."
            actions={
              <Badge tone={queueTotals.failed > 0 ? "red" : "neutral"}>
                {queueTotals.failed > 0
                  ? `${queueTotals.failed} failed`
                  : "No failed jobs"}
              </Badge>
            }
          />
          {queues.length ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead className="bg-surface-subtle">
                    <tr className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-faint">
                      <th className="px-4 py-3">Queue</th>
                      <th className="px-4 py-3 text-right">Waiting</th>
                      <th className="px-4 py-3 text-right">Active</th>
                      <th className="px-4 py-3 text-right">Delayed</th>
                      <th className="px-4 py-3 text-right">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queues.map((queue) => (
                      <tr
                        key={queue.name}
                        className="border-t border-line text-sm text-ink"
                      >
                        <td className="px-4 py-3.5 font-medium">
                          <span className="inline-flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bid-light text-bid">
                              <Activity
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </span>
                            {queueLabel(queue.name)}
                          </span>
                        </td>
                        <QueueCount value={queue.counts.wait} />
                        <QueueCount value={queue.counts.active} active />
                        <QueueCount value={queue.counts.delayed} />
                        <QueueCount value={queue.counts.failed} failed />
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-line bg-surface-subtle/60 text-sm font-semibold text-ink">
                    <tr>
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">
                        {queueTotals.wait}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {queueTotals.active}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {queueTotals.delayed}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right",
                          queueTotals.failed > 0 && "text-danger",
                        )}
                      >
                        {queueTotals.failed}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong bg-surface-subtle/50 px-5 py-10 text-center text-sm text-ink-muted">
              Queue details are unavailable while background jobs are offline.
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="External integrations"
              description="Required configuration for connected services."
            />
            <div className="space-y-3">
              <IntegrationRow
                title="Google Calendar"
                description="Availability and meeting events"
                icon={CalendarDays}
                status={snapshot.integrations.calendar.status}
              />
              <IntegrationRow
                title="Mux Video"
                description="Video upload and playback"
                icon={Video}
                status={snapshot.integrations.video.status}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Runtime"
              description="Current API process information."
            />
            <dl className="divide-y divide-line overflow-hidden rounded-xl border border-border">
              <RuntimeRow label="Environment" value={titleCase(snapshot.environment)} />
              <RuntimeRow label="API uptime" value={formatUptime(snapshot.runtime.uptimeSeconds)} />
              <RuntimeRow label="Node runtime" value={snapshot.runtime.nodeVersion} />
              <RuntimeRow
                label="Worker"
                value={jobs?.worker.status ? titleCase(jobs.worker.status) : "Unavailable"}
                valueClassName={jobs?.worker.status ? "text-success-dark" : "text-danger"}
              />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DependencyCard({
  title,
  icon: Icon,
  dependency,
  description,
}: {
  title: string;
  icon: LucideIcon;
  dependency: HealthDependency;
  description: string;
}) {
  const connected = dependency.status === "connected";
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        connected ? "border-success/20" : "border-danger/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            connected
              ? "bg-success-light text-success-dark"
              : "bg-danger-light text-danger",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <Badge tone={connected ? "green" : "red"}>
          {connected ? "Connected" : "Unavailable"}
        </Badge>
      </div>
      <h3 className="mt-5 font-semibold text-ink">{title}</h3>
      <p className="mt-1 min-h-10 text-sm leading-5 text-ink-muted">
        {connected ? description : "This required service did not respond."}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-faint">
        <span>Response time</span>
        <span className="font-mono font-medium text-ink-muted">
          {dependency.latencyMs} ms
        </span>
      </div>
    </Card>
  );
}

function IntegrationRow({
  title,
  description,
  icon: Icon,
  status,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  status: HealthConfigurationStatus;
}) {
  const configured = status === "configured";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-subtle/50 p-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card text-bid shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-ink">{title}</div>
        <div className="mt-0.5 truncate text-xs text-ink-muted">
          {description}
        </div>
      </div>
      <Badge tone={configured ? "green" : "amber"}>
        {configured ? "Configured" : "Not configured"}
      </Badge>
    </div>
  );
}

function RuntimeRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-surface-subtle/35 px-4 py-3 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={cn("font-medium text-ink", valueClassName)}>{value}</dd>
    </div>
  );
}

function QueueCount({
  value,
  active,
  failed,
}: {
  value: number;
  active?: boolean;
  failed?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 text-right font-mono text-ink-muted",
        active && value > 0 && "font-semibold text-info",
        failed && value > 0 && "font-semibold text-danger",
      )}
    >
      {value}
    </td>
  );
}

function sumQueueCounts(queues: HealthQueue[]) {
  return queues.reduce(
    (total, queue) => ({
      wait: total.wait + queue.counts.wait,
      active: total.active + queue.counts.active,
      delayed: total.delayed + queue.counts.delayed,
      failed: total.failed + queue.counts.failed,
    }),
    { wait: 0, active: 0, delayed: 0, failed: 0 },
  );
}

function queueLabel(value: string) {
  return value
    .replace(/^bid-/, "")
    .split("-")
    .map(titleCase)
    .join(" ");
}

function titleCase(value: string) {
  if (!value) return value;
  return `${value.charAt(0).toUpperCase()}${value.slice(1).replace(/_/g, " ")}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(minutes, 0)}m`;
}
