import { Injectable, Logger } from "@nestjs/common";
import {
  ExternalResourceDeletionStatus,
  ExternalResourceProvider,
} from "@prisma/client";
import { CalendarService } from "../calendar/calendar.service";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../files/storage.service";
import { MuxClient } from "../video/mux.client";

@Injectable()
export class ExternalResourceCleanupService {
  private readonly logger = new Logger(ExternalResourceCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mux: MuxClient,
    private readonly calendar: CalendarService,
  ) {}

  async processPending(limit = 25) {
    const now = new Date();
    await this.prisma.externalResourceDeletion.updateMany({
      where: {
        status: ExternalResourceDeletionStatus.processing,
        lockedAt: { lt: new Date(now.getTime() - 5 * 60_000) },
      },
      data: {
        status: ExternalResourceDeletionStatus.failed,
        lockedAt: null,
        nextAttemptAt: now,
        error: "Cleanup worker stopped before completion.",
      },
    });
    const records = await this.prisma.externalResourceDeletion.findMany({
      where: {
        status: {
          in: [
            ExternalResourceDeletionStatus.pending,
            ExternalResourceDeletionStatus.failed,
          ],
        },
        attempts: { lt: 10 },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit,
    });

    let processed = 0;
    let failed = 0;
    for (const record of records) {
      const attempt = record.attempts + 1;
      const locked = await this.prisma.externalResourceDeletion.updateMany({
        where: {
          id: record.id,
          status: {
            in: [
              ExternalResourceDeletionStatus.pending,
              ExternalResourceDeletionStatus.failed,
            ],
          },
          attempts: { lt: 10 },
        },
        data: {
          status: ExternalResourceDeletionStatus.processing,
          attempts: { increment: 1 },
          lockedAt: new Date(),
          nextAttemptAt: null,
          error: null,
        },
      });
      if (!locked.count) continue;

      try {
        await this.deleteExternal(record);
        await this.prisma.externalResourceDeletion.update({
          where: { id: record.id },
          data: {
            status: ExternalResourceDeletionStatus.completed,
            completedAt: new Date(),
            lockedAt: null,
            nextAttemptAt: null,
            error: null,
          },
        });
        processed += 1;
      } catch (error: unknown) {
        failed += 1;
        const exhausted = attempt >= 10;
        const delayMinutes = Math.min(2 ** attempt, 60);
        this.logger.error(
          "External cleanup failed provider=" +
            record.provider +
            " record=" +
            record.id +
            " attempt=" +
            attempt +
            ": " +
            this.errorMessage(error),
          error instanceof Error ? error.stack : undefined,
        );
        await this.prisma.externalResourceDeletion.updateMany({
          where: {
            id: record.id,
            status: ExternalResourceDeletionStatus.processing,
          },
          data: {
            status: ExternalResourceDeletionStatus.failed,
            lockedAt: null,
            nextAttemptAt: exhausted
              ? null
              : new Date(Date.now() + delayMinutes * 60_000),
            error: this.errorMessage(error),
          },
        });
      }
    }
    return {
      processed,
      failed,
      total: records.length,
      hasMore: records.length === limit,
    };
  }

  private deleteExternal(record: {
    provider: ExternalResourceProvider;
    externalId: string;
    ownerUserId: string | null;
  }) {
    if (record.provider === ExternalResourceProvider.mux_asset) {
      return this.mux.deleteAsset(record.externalId);
    }
    if (record.provider === ExternalResourceProvider.mux_upload) {
      return this.mux.cancelDirectUpload(record.externalId);
    }
    if (record.provider === ExternalResourceProvider.object_storage) {
      return this.storage.deleteObject(record.externalId);
    }
    if (!record.ownerUserId) {
      throw new Error("Calendar cleanup is missing its owner user.");
    }
    return this.calendar.deleteSessionEvent(
      record.ownerUserId,
      record.externalId,
    );
  }

  private errorMessage(error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown cleanup error";
    return message.slice(0, 500);
  }
}
