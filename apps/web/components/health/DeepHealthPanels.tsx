import {
  BellRing,
  CalendarDays,
  CircleAlert,
  Cpu,
  DatabaseBackup,
  FileClock,
  HardDrive,
  MemoryStick,
  Trash2,
  Video,
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Card, CardHeader } from "@/components/shared/Card";
import { Notice } from "@/components/shared/PageHeader";
import type {
  DeepHealthDiagnostics,
  HealthResourceStatus,
} from "@/lib/api/health";
import { cn } from "@/lib/utils";

export function DeepHealthPanels({
  diagnostics,
}: {
  diagnostics: DeepHealthDiagnostics | null;
}) {
  if (!diagnostics) {
    return (
      <Notice className="mt-5 border border-warning/25 bg-warning-light/45 text-warning-dark">
        Core readiness is available, but deeper operational diagnostics could
        not be collected during this check.
      </Notice>
    );
  }

  const workloads = diagnostics.workloads;
  return (
    <div className="mt-5 space-y-5">
      {diagnostics.issues.length ? (
        <Card className="border-warning/25 bg-warning-light/25">
          <CardHeader
            title="Items requiring attention"
            description="Operational signals that are outside their healthy range."
            actions={
              <Badge
                tone={
                  diagnostics.issues.some(
                    (issue) => issue.severity === "critical",
                  )
                    ? "red"
                    : "amber"
                }
              >
                {diagnostics.issues.length} active
              </Badge>
            }
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {diagnostics.issues.map((issue) => (
              <div
                key={issue.key}
                className="flex items-start gap-3 rounded-xl border border-border bg-card/75 p-3.5"
              >
                <CircleAlert
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    issue.severity === "critical"
                      ? "text-danger"
                      : "text-warning-dark",
                  )}
                  aria-hidden="true"
                />
                <span className="text-sm leading-5 text-ink">
                  {issue.message}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <ResourceCard
          title="Disk space"
          icon={HardDrive}
          status={diagnostics.system.disk.status}
          percent={diagnostics.system.disk.usedPercent}
          detail={`${formatBytes(diagnostics.system.disk.availableBytes)} available of ${formatBytes(diagnostics.system.disk.totalBytes)}`}
        />
        <ResourceCard
          title="System memory"
          icon={MemoryStick}
          status={diagnostics.system.memory.status}
          percent={diagnostics.system.memory.usedPercent}
          detail={`${formatBytes(diagnostics.system.memory.availableBytes)} available of ${formatBytes(diagnostics.system.memory.totalBytes)}`}
        />
        <ResourceCard
          title="API process"
          icon={Cpu}
          status="healthy"
          value={formatBytes(diagnostics.system.memory.processRssBytes)}
          detail={`Heap ${formatBytes(diagnostics.system.memory.processHeapUsedBytes)} · Load ${diagnostics.system.cpu.loadAverage.join(" / ")}`}
        />
      </div>

      <Card>
        <CardHeader
          title="Processing health"
          description="Recent failures and work that has remained unfinished beyond its expected window."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <WorkloadCard
            title="Video"
            icon={Video}
            primary={workloads.video.stuckProcessing}
            primaryLabel="stuck processing"
            secondary={`${workloads.video.failedLast24Hours} failed in 24h`}
            warning={
              workloads.video.stuckProcessing > 0 ||
              workloads.video.failedLast24Hours > 0
            }
          />
          <WorkloadCard
            title="Deliveries"
            icon={BellRing}
            primary={workloads.notifications.stuckPending}
            primaryLabel="waiting too long"
            secondary={`${workloads.notifications.failedLast24Hours} failed in 24h`}
            warning={
              workloads.notifications.stuckPending > 0 ||
              workloads.notifications.failedLast24Hours > 0
            }
          />
          <WorkloadCard
            title="Cleanup"
            icon={Trash2}
            primary={workloads.externalCleanup.backlog}
            primaryLabel="in backlog"
            secondary={`${workloads.externalCleanup.exhausted} exhausted retries`}
            warning={workloads.externalCleanup.exhausted > 0}
          />
          <WorkloadCard
            title="Report exports"
            icon={FileClock}
            primary={workloads.reportExports.stuckProcessing}
            primaryLabel="stuck processing"
            secondary={`${workloads.reportExports.failedLast24Hours} failed in 24h`}
            warning={
              workloads.reportExports.stuckProcessing > 0 ||
              workloads.reportExports.failedLast24Hours > 0
            }
          />
          <WorkloadCard
            title="Audit stream"
            icon={DatabaseBackup}
            primary={workloads.audit.failedLast24Hours}
            primaryLabel="failed in 24h"
            secondary={
              workloads.audit.failedLast24Hours
                ? "Review worker logs"
                : "No recent failures"
            }
            warning={workloads.audit.failedLast24Hours > 0}
          />
          <WorkloadCard
            title="Calendar"
            icon={CalendarDays}
            primary={workloads.calendar.connectionsNeedingAttention}
            primaryLabel="connections need attention"
            secondary={
              workloads.calendar.connectionsNeedingAttention
                ? "Users may need to reconnect"
                : "Connected accounts are healthy"
            }
            warning={workloads.calendar.connectionsNeedingAttention > 0}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-xs text-ink-faint">
          <span>
            Last Mux webhook:{" "}
            {workloads.video.lastWebhookAt
              ? formatDateTime(workloads.video.lastWebhookAt)
              : "None received"}
          </span>
          <span>
            Backup tracking:{" "}
            {diagnostics.backup.status === "tracked"
              ? `last successful ${formatDateTime(diagnostics.backup.lastSuccessfulAt)}`
              : "not yet recorded"}
          </span>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Queue timing and schedules"
          description="Oldest waiting work, recent completions, and registered recurring schedules."
        />
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead className="bg-surface-subtle">
                <tr className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-faint">
                  <th className="px-4 py-3">Queue</th>
                  <th className="px-4 py-3">Oldest waiting</th>
                  <th className="px-4 py-3">Last completed</th>
                  <th className="px-4 py-3 text-right">Schedules</th>
                  <th className="px-4 py-3">Next run</th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.queues.map((queue) => {
                  const nextRun = queue.schedulers
                    .map((scheduler) => scheduler.nextRunAt)
                    .filter((value): value is string => Boolean(value))
                    .sort()[0];
                  return (
                    <tr
                      key={queue.name}
                      className="border-t border-line text-sm text-ink"
                    >
                      <td className="px-4 py-3.5 font-medium">
                        {queueLabel(queue.name)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3.5 text-ink-muted",
                          queue.oldestWaitingAgeSeconds !== null &&
                            queue.oldestWaitingAgeSeconds > 300 &&
                            "font-medium text-warning-dark",
                        )}
                      >
                        {queue.oldestWaitingAgeSeconds === null
                          ? "Clear"
                          : formatDuration(queue.oldestWaitingAgeSeconds)}
                      </td>
                      <td className="px-4 py-3.5 text-ink-muted">
                        {queue.lastCompletedAt
                          ? formatDateTime(queue.lastCompletedAt)
                          : "No recent completion"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-ink-muted">
                        {queue.schedulers.length}
                      </td>
                      <td className="px-4 py-3.5 text-ink-muted">
                        {nextRun ? formatDateTime(nextRun) : "On demand"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ResourceCard({
  title,
  icon: Icon,
  status,
  percent,
  value,
  detail,
}: {
  title: string;
  icon: typeof HardDrive;
  status: HealthResourceStatus;
  percent?: number;
  value?: string;
  detail: string;
}) {
  const tone = resourceTone(status);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            tone.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <Badge tone={tone.badge}>{title === "API process" ? "Live" : titleCase(status)}</Badge>
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        {value ?? `${percent}% used`}
      </div>
      {percent !== undefined ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle">
          <div
            className={cn("h-full rounded-full", tone.bar)}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-ink-muted">{detail}</p>
    </Card>
  );
}

function WorkloadCard({
  title,
  icon: Icon,
  primary,
  primaryLabel,
  secondary,
  warning,
}: {
  title: string;
  icon: typeof Video;
  primary: number;
  primaryLabel: string;
  secondary: string;
  warning: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-subtle/35 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-ink">{title}</span>
        <Icon
          className={cn(
            "h-4 w-4",
            warning ? "text-warning-dark" : "text-success",
          )}
          aria-hidden="true"
        />
      </div>
      <div className="mt-4 text-2xl font-semibold text-ink">{primary}</div>
      <div className="mt-0.5 text-xs text-ink-muted">{primaryLabel}</div>
      <div className="mt-3 border-t border-line pt-3 text-xs text-ink-faint">
        {secondary}
      </div>
    </div>
  );
}

function resourceTone(status: HealthResourceStatus) {
  if (status === "critical") {
    return {
      badge: "red" as const,
      icon: "bg-danger-light text-danger",
      bar: "bg-danger",
    };
  }
  if (status === "warning") {
    return {
      badge: "amber" as const,
      icon: "bg-warning-light text-warning-dark",
      bar: "bg-warning",
    };
  }
  return {
    badge: "green" as const,
    icon: "bg-success-light text-success-dark",
    bar: "bg-success",
  };
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** index).toFixed(index > 2 ? 1 : 0)} ${units[index]}`;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3_600)}h ${Math.floor((seconds % 3_600) / 60)}m`;
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
    timeStyle: "short",
  }).format(date);
}
