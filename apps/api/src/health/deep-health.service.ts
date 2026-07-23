import { statfs } from "node:fs/promises";
import { freemem, loadavg, totalmem } from "node:os";
import { Injectable } from "@nestjs/common";
import {
  AssetStatus,
  AuditOutboxStatus,
  CalendarConnectionStatus,
  ExternalResourceDeletionStatus,
  NotificationDeliveryStatus,
  ReportExportStatus,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { JobsHealthService } from "../jobs/jobs-health.service";

type HealthIssue = {
  key: string;
  severity: "warning" | "critical";
  message: string;
};

@Injectable()
export class DeepHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsHealthService,
  ) {}

  async status() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60_000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60_000);

    const [system, queues, workloadRows, backupRun] = await Promise.all([
      this.systemStatus(),
      this.jobs.diagnostics(),
      Promise.all([
        this.prisma.videoAsset.count({
          where: {
            status: { in: [AssetStatus.pending, AssetStatus.processing] },
            createdAt: { lte: thirtyMinutesAgo },
          },
        }),
        this.prisma.videoAsset.count({
          where: {
            status: AssetStatus.failed,
            updatedAt: { gte: oneDayAgo },
          },
        }),
        this.prisma.videoWebhookEvent.aggregate({
          _max: { receivedAt: true },
        }),
        this.prisma.notificationDelivery.count({
          where: {
            status: NotificationDeliveryStatus.failed,
            failedAt: { gte: oneDayAgo },
          },
        }),
        this.prisma.notificationDelivery.count({
          where: {
            status: {
              in: [
                NotificationDeliveryStatus.pending,
                NotificationDeliveryStatus.processing,
              ],
            },
            createdAt: { lte: fifteenMinutesAgo },
          },
        }),
        this.prisma.externalResourceDeletion.count({
          where: {
            status: {
              in: [
                ExternalResourceDeletionStatus.pending,
                ExternalResourceDeletionStatus.failed,
              ],
            },
          },
        }),
        this.prisma.externalResourceDeletion.count({
          where: {
            status: ExternalResourceDeletionStatus.failed,
            attempts: { gte: 10 },
          },
        }),
        this.prisma.reportExport.count({
          where: {
            status: {
              in: [ReportExportStatus.queued, ReportExportStatus.processing],
            },
            createdAt: { lte: fifteenMinutesAgo },
          },
        }),
        this.prisma.reportExport.count({
          where: {
            status: ReportExportStatus.failed,
            updatedAt: { gte: oneDayAgo },
          },
        }),
        this.prisma.auditOutbox.count({
          where: {
            status: AuditOutboxStatus.failed,
            updatedAt: { gte: oneDayAgo },
          },
        }),
        this.prisma.calendarConnection.count({
          where: {
            status: {
              in: [
                CalendarConnectionStatus.error,
                CalendarConnectionStatus.revoked,
              ],
            },
          },
        }),
      ]),
      this.prisma.deploymentTaskRun.findUnique({
        where: { key: "database-backup-latest" },
      }),
    ]);

    const [
      stuckVideos,
      failedVideos,
      latestWebhook,
      failedDeliveries,
      stuckDeliveries,
      cleanupBacklog,
      exhaustedCleanup,
      stuckReports,
      failedReports,
      failedAuditEvents,
      calendarConnectionProblems,
    ] = workloadRows;
    const issues: HealthIssue[] = [];
    const backupAgeHours = backupRun
      ? Number(
          (
            (now.getTime() - backupRun.completedAt.getTime()) /
            3_600_000
          ).toFixed(1),
        )
      : null;

    if (system.disk.status !== "healthy") {
      issues.push({
        key: "disk",
        severity: system.disk.status === "critical" ? "critical" : "warning",
        message: `Disk space is ${system.disk.usedPercent}% used.`,
      });
    }
    if (system.memory.status !== "healthy") {
      issues.push({
        key: "memory",
        severity:
          system.memory.status === "critical" ? "critical" : "warning",
        message: `System memory is ${system.memory.usedPercent}% used.`,
      });
    }

    for (const queue of queues) {
      if (queue.counts.failed > 0) {
        issues.push({
          key: `queue:${queue.name}:failed`,
          severity: "warning",
          message: `${queue.counts.failed} failed job${queue.counts.failed === 1 ? "" : "s"} in ${queue.name}.`,
        });
      }
      if (
        queue.oldestWaitingAgeSeconds !== null &&
        queue.oldestWaitingAgeSeconds > 5 * 60
      ) {
        issues.push({
          key: `queue:${queue.name}:waiting`,
          severity: "warning",
          message: `The oldest waiting job in ${queue.name} is over five minutes old.`,
        });
      }
    }

    const workloadIssues = [
      [stuckVideos, "videos:stuck", "video assets are still processing"],
      [failedVideos, "videos:failed", "video assets failed in the last 24 hours"],
      [
        failedDeliveries,
        "deliveries:failed",
        "notification deliveries failed in the last 24 hours",
      ],
      [
        stuckDeliveries,
        "deliveries:stuck",
        "notification deliveries have been pending for over 15 minutes",
      ],
      [
        exhaustedCleanup,
        "cleanup:exhausted",
        "external resource deletions exhausted their retries",
      ],
      [
        stuckReports,
        "reports:stuck",
        "report exports have been processing for over 15 minutes",
      ],
      [
        failedReports,
        "reports:failed",
        "report exports failed in the last 24 hours",
      ],
      [
        failedAuditEvents,
        "audit:failed",
        "audit events failed in the last 24 hours",
      ],
      [
        calendarConnectionProblems,
        "calendar:connections",
        "calendar connections need reconnection",
      ],
    ] as const;
    for (const [count, key, label] of workloadIssues) {
      if (count > 0) {
        issues.push({
          key,
          severity: key === "cleanup:exhausted" ? "critical" : "warning",
          message: `${count} ${label}.`,
        });
      }
    }
    if (backupAgeHours !== null && backupAgeHours > 26) {
      issues.push({
        key: "backup:stale",
        severity: "warning",
        message: `The last recorded database backup is ${Math.floor(backupAgeHours)} hours old.`,
      });
    }

    return {
      system,
      queues,
      workloads: {
        video: {
          stuckProcessing: stuckVideos,
          failedLast24Hours: failedVideos,
          lastWebhookAt:
            latestWebhook._max.receivedAt?.toISOString() ?? null,
        },
        notifications: {
          failedLast24Hours: failedDeliveries,
          stuckPending: stuckDeliveries,
        },
        externalCleanup: {
          backlog: cleanupBacklog,
          exhausted: exhaustedCleanup,
        },
        reportExports: {
          stuckProcessing: stuckReports,
          failedLast24Hours: failedReports,
        },
        audit: {
          failedLast24Hours: failedAuditEvents,
        },
        calendar: {
          connectionsNeedingAttention: calendarConnectionProblems,
        },
      },
      backup: backupRun
        ? {
            status: "tracked" as const,
            lastSuccessfulAt: backupRun.completedAt.toISOString(),
            ageHours: backupAgeHours,
            details: backupRun.details,
          }
        : {
            status: "not_tracked" as const,
            lastSuccessfulAt: null,
            ageHours: null,
            details: null,
          },
      issues,
    };
  }

  private async systemStatus() {
    const filesystem = await statfs("/");
    const totalDiskBytes = filesystem.blocks * filesystem.bsize;
    const availableDiskBytes = filesystem.bavail * filesystem.bsize;
    const diskUsedPercent = this.percent(
      totalDiskBytes - availableDiskBytes,
      totalDiskBytes,
    );
    const totalMemoryBytes = totalmem();
    const availableMemoryBytes = freemem();
    const memoryUsedPercent = this.percent(
      totalMemoryBytes - availableMemoryBytes,
      totalMemoryBytes,
    );
    const processMemory = process.memoryUsage();

    return {
      disk: {
        status: this.resourceStatus(diskUsedPercent, 85, 95),
        totalBytes: totalDiskBytes,
        availableBytes: availableDiskBytes,
        usedPercent: diskUsedPercent,
      },
      memory: {
        status: this.resourceStatus(memoryUsedPercent, 90, 95),
        totalBytes: totalMemoryBytes,
        availableBytes: availableMemoryBytes,
        usedPercent: memoryUsedPercent,
        processRssBytes: processMemory.rss,
        processHeapUsedBytes: processMemory.heapUsed,
      },
      cpu: {
        loadAverage: loadavg().map((value) => Number(value.toFixed(2))),
      },
    };
  }

  private percent(value: number, total: number) {
    if (!Number.isFinite(total) || total <= 0) return 0;
    return Number(((value / total) * 100).toFixed(1));
  }

  private resourceStatus(value: number, warning: number, critical: number) {
    if (value >= critical) return "critical" as const;
    if (value >= warning) return "warning" as const;
    return "healthy" as const;
  }
}
