import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AssetStatus,
  ContentItemStatus,
  ProgrammeAccessType,
  Prisma,
  User,
  UserRole,
  VideoAsset,
} from "@prisma/client";
import { createSign } from "crypto";
import { AuditService } from "../audit/audit.service";
import { IntegrationLoggerService } from "../common/observability/integration-logger.service";
import { PrismaService } from "../database/prisma.service";
import { MuxClient } from "./mux.client";
import { verifyMuxWebhookSignature } from "./mux-signature";

type MuxWebhook = {
  id?: string;
  type?: string;
  data?: {
    id?: string;
    asset_id?: string;
    upload_id?: string;
    passthrough?: string;
    duration?: number;
    playback_ids?: Array<{ id?: string; policy?: string }>;
    meta?: { external_id?: string };
    errors?: { messages?: string[]; message?: string };
    new_asset_settings?: {
      passthrough?: string;
      meta?: { external_id?: string };
    };
  };
};

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mux: MuxClient,
    private readonly audit: AuditService,
    private readonly integration: IntegrationLoggerService,
  ) {}

  async createDirectUpload(user: User) {
    const video = await this.prisma.videoAsset.create({
      data: { uploadedById: user.id, status: AssetStatus.pending },
    });

    try {
      const upload = await this.mux.createDirectUpload(video.id, user.id);
      const updated = await this.prisma.videoAsset.update({
        where: { id: video.id },
        data: { muxUploadId: upload.id },
      });
      return {
        video: this.mapVideo(updated),
        upload: { url: upload.url, method: "PUT" as const },
      };
    } catch (error) {
      await this.prisma.videoAsset.delete({ where: { id: video.id } });
      throw error;
    }
  }

  async getAsset(user: User, id: string) {
    const video = await this.findOwnedVideo(user, id);
    return this.mapVideo(video);
  }

  async cancelDirectUpload(user: User, id: string) {
    const video = await this.findOwnedVideo(user, id);
    if (video.contentItemId) {
      throw new BadRequestException("Attached videos cannot be cancelled.");
    }
    if (
      video.status === AssetStatus.ready ||
      video.status === AssetStatus.archived
    ) {
      throw new BadRequestException(
        "This video upload can no longer be cancelled.",
      );
    }

    if (video.muxUploadId) {
      await this.mux
        .cancelDirectUpload(video.muxUploadId)
        .catch(() => undefined);
    }
    const updated = await this.audit.capture(
      {
        action: "videos.upload.cancelled",
        entityType: "videoAsset",
        entityId: ({ id: entityId }) => entityId,
        summary: "Cancelled video upload",
      },
      (tx) =>
        tx.videoAsset.update({
          where: { id },
          data: {
            status: AssetStatus.archived,
            failureReason: "Upload cancelled.",
          },
        }),
    );
    return this.mapVideo(updated);
  }

  async getSignedPlayback(user: User, id: string) {
    const video = await this.prisma.videoAsset.findUnique({
      where: { id },
      include: { contentItem: true },
    });
    if (!video || !video.contentItem) {
      throw new NotFoundException("Video was not found.");
    }
    await this.assertPlaybackAccess(user, video.contentItem.id);
    if (video.status !== AssetStatus.ready || !video.playbackId) {
      throw new BadRequestException("Video is not ready for playback.");
    }

    const expiresAtSeconds =
      Math.floor(Date.now() / 1000) +
      Math.max(2 * 60 * 60, (video.duration ?? 0) + 30 * 60);
    return {
      playbackId: video.playbackId,
      token: this.signMuxToken(video.playbackId, expiresAtSeconds, "v"),
      thumbnailToken: this.signMuxToken(
        video.playbackId,
        expiresAtSeconds,
        "t",
      ),
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    };
  }

  async processWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    body: unknown,
  ) {
    const secret = this.config.get<string>("MUX_WEBHOOK_SECRET");
    if (!secret) {
      throw new ServiceUnavailableException(
        "Mux webhooks are not configured for this environment.",
      );
    }
    if (!rawBody || !verifyMuxWebhookSignature(rawBody, signature, secret)) {
      throw new UnauthorizedException("Invalid Mux webhook signature.");
    }
    const event = body as MuxWebhook;
    if (!event.id || !event.type || !event.data?.id) {
      throw new BadRequestException("Invalid Mux webhook payload.");
    }
    const eventId = event.id;
    const eventType = event.type;

    return this.integration.trackWebhook(
      {
        provider: "mux",
        operation: eventType,
        externalEventId: eventId,
      },
      () =>
        this.prisma.$transaction(async (tx) => {
          const internalId =
            event.data?.meta?.external_id ??
            event.data?.new_asset_settings?.meta?.external_id ??
            event.data?.passthrough ??
            event.data?.new_asset_settings?.passthrough ??
            null;
          const video = await tx.videoAsset.findFirst({
            where: {
              OR: [
                ...(internalId ? [{ id: internalId }] : []),
                { muxAssetId: event.data?.id },
                { muxAssetId: event.data?.asset_id },
                { muxUploadId: event.data?.id },
                { muxUploadId: event.data?.upload_id },
              ].filter((condition) =>
                Object.values(condition).every((value) => Boolean(value)),
              ),
            },
          });

          const inserted = await tx.videoWebhookEvent.createMany({
            skipDuplicates: true,
            data: {
              id: eventId,
              eventType,
              videoAssetId: video?.id ?? null,
              processedAt: new Date(),
            },
          });
          if (inserted.count === 0) return { received: true, duplicate: true };
          if (!video) return { received: true, matched: false };
          if (video.status === AssetStatus.archived) {
            return { received: true, matched: true, ignored: true };
          }

          const update = this.webhookUpdate(event);
          if (update) {
            const updated = await tx.videoAsset.update({
              where: { id: video.id },
              data: update.video,
            });
            if (updated.contentItemId && update.contentStatus) {
              await tx.contentItem.update({
                where: { id: updated.contentItemId },
                data: { status: update.contentStatus },
              });
            }
            await this.audit.enqueue(
              {
                eventKey: `mux:${event.id}`,
                action: `videos.mux.${event.type}`,
                entityType: "videoAsset",
                entityId: video.id,
                summary: `Mux video transition: ${event.type}`,
              },
              tx,
            );
          }

          return { received: true, matched: true };
        }),
    );
  }

  private webhookUpdate(event: MuxWebhook) {
    const data = event.data!;
    if (event.type === "video.upload.asset_created") {
      return {
        video: {
          muxAssetId: data.asset_id ?? null,
          status: AssetStatus.processing,
          failureReason: null,
          lastReconciledAt: new Date(),
          reconciliationFailures: 0,
        },
        contentStatus: ContentItemStatus.processing,
      };
    }
    if (
      event.type === "video.upload.errored" ||
      event.type === "video.upload.timed_out" ||
      event.type === "video.upload.cancelled"
    ) {
      return {
        video: {
          status: AssetStatus.failed,
          failureReason:
            event.type === "video.upload.timed_out"
              ? "The video upload expired before it completed."
              : event.type === "video.upload.cancelled"
                ? "The video upload was cancelled before processing."
                : "The uploaded file could not be processed as a video.",
          lastReconciledAt: new Date(),
          reconciliationFailures: 0,
        },
        contentStatus: ContentItemStatus.failed,
      };
    }
    if (event.type === "video.asset.created") {
      return {
        video: {
          muxAssetId: data.id,
          status: AssetStatus.processing,
          failureReason: null,
          lastReconciledAt: new Date(),
          reconciliationFailures: 0,
        },
        contentStatus: ContentItemStatus.processing,
      };
    }
    if (event.type === "video.asset.ready") {
      const playbackId = data.playback_ids?.find(
        (playback) => playback.policy === "signed",
      )?.id;
      if (!playbackId) return null;
      return {
        video: {
          muxAssetId: data.id,
          playbackId,
          duration: data.duration ? Math.ceil(data.duration) : null,
          playbackPolicy: "signed",
          status: AssetStatus.ready,
          readyAt: new Date(),
          failureReason: null,
          lastReconciledAt: new Date(),
          reconciliationFailures: 0,
        },
        contentStatus: ContentItemStatus.ready,
      };
    }
    if (event.type === "video.asset.errored") {
      return {
        video: {
          muxAssetId: data.id,
          status: AssetStatus.failed,
          failureReason:
            "The uploaded file could not be processed as a video.",
          lastReconciledAt: new Date(),
          reconciliationFailures: 0,
        },
        contentStatus: ContentItemStatus.failed,
      };
    }
    return null;
  }

  async reconcileStaleAssets() {
    const interval = this.config.get<number>(
      "VIDEO_RECONCILIATION_INTERVAL_MS",
      300_000,
    );
    const batchSize = this.config.get<number>(
      "VIDEO_RECONCILIATION_BATCH_SIZE",
      25,
    );
    const dueBefore = new Date(Date.now() - interval);
    const videos = await this.prisma.videoAsset.findMany({
      where: {
        status: { in: [AssetStatus.pending, AssetStatus.processing] },
        OR: [
          { lastReconciledAt: null },
          { lastReconciledAt: { lte: dueBefore } },
        ],
      },
      orderBy: [
        { lastReconciledAt: { sort: "asc", nulls: "first" } },
        { createdAt: "asc" },
      ],
      take: batchSize,
    });
    const result = { checked: 0, ready: 0, failed: 0, processing: 0 };

    for (const video of videos) {
      result.checked += 1;
      const status = await this.reconcileAsset(video);
      result[status] += 1;
    }

    if (result.checked > 0) {
      this.logger.log(
        `Reconciled ${result.checked} video asset(s): ${result.ready} ready, ${result.failed} failed, ${result.processing} still processing`,
      );
    }
    return result;
  }

  private async reconcileAsset(video: VideoAsset) {
    const timeout = this.config.get<number>(
      "VIDEO_PROCESSING_TIMEOUT_MS",
      86_400_000,
    );
    const expired = Date.now() - video.createdAt.getTime() >= timeout;

    try {
      let muxAssetId = video.muxAssetId;
      if (!muxAssetId) {
        if (!video.muxUploadId) {
          return await this.failReconciliation(
            video,
            "The video upload could not be verified. Delete it and upload the file again.",
          );
        }
        const upload = await this.mux.getDirectUpload(video.muxUploadId);
        if (!upload) {
          if (!expired) {
            await this.touchReconciliation(video.id, {
              status: AssetStatus.pending,
            });
            return "processing" as const;
          }
          return await this.failReconciliation(
            video,
            "The video upload is no longer available. Delete it and upload the file again.",
          );
        }
        if (
          upload.status === "errored" ||
          upload.status === "cancelled" ||
          upload.status === "timed_out"
        ) {
          this.logProviderFailure(
            video.id,
            upload.error?.message ?? upload.status,
          );
          return await this.failReconciliation(
            video,
            upload.status === "timed_out"
              ? "The video upload expired before it completed. Delete it and upload the file again."
              : "The uploaded file could not be processed as a video. Delete it and upload a supported video file.",
          );
        }
        if (upload.status !== "asset_created" || !upload.asset_id) {
          if (expired) {
            return await this.failReconciliation(
              video,
              "The video upload did not complete in time. Delete it and upload the file again.",
            );
          }
          await this.touchReconciliation(video.id, {
            status: AssetStatus.pending,
          });
          return "processing" as const;
        }
        muxAssetId = upload.asset_id;
        await this.touchReconciliation(video.id, {
          muxAssetId,
          status: AssetStatus.processing,
        });
      }

      const asset = await this.mux.getAsset(muxAssetId);
      if (!asset) {
        if (!expired) {
          await this.touchReconciliation(video.id, {
            muxAssetId,
            status: AssetStatus.processing,
          });
          return "processing" as const;
        }
        return await this.failReconciliation(
          video,
          "The processed video is no longer available. Delete it and upload the file again.",
        );
      }
      if (asset.status === "errored") {
        this.logProviderFailure(
          video.id,
          asset.errors?.messages?.[0] ?? asset.errors?.message ?? asset.status,
        );
        return await this.failReconciliation(
          video,
          "The uploaded file could not be processed as a video. Delete it and upload a supported video file.",
        );
      }
      if (asset.status === "ready") {
        const playbackId = asset.playback_ids?.find(
          (playback) => playback.policy === "signed",
        )?.id;
        if (playbackId) {
          await this.applyReconciledState(
            video,
            {
              muxAssetId,
              playbackId,
              duration: asset.duration ? Math.ceil(asset.duration) : null,
              playbackPolicy: "signed",
              status: AssetStatus.ready,
              readyAt: new Date(),
              failureReason: null,
              lastReconciledAt: new Date(),
              reconciliationFailures: 0,
            },
            ContentItemStatus.ready,
          );
          return "ready" as const;
        }
      }
      if (expired) {
        return await this.failReconciliation(
          video,
          "Video processing did not finish in time. Delete it and upload the file again.",
        );
      }
      await this.touchReconciliation(video.id, {
        muxAssetId,
        status: AssetStatus.processing,
      });
      return "processing" as const;
    } catch (error) {
      if (expired) {
        return this.failReconciliation(
          video,
          "We could not confirm that video processing completed. Delete it and upload the file again.",
        );
      }
      await this.prisma.videoAsset.updateMany({
        where: {
          id: video.id,
          status: { in: [AssetStatus.pending, AssetStatus.processing] },
        },
        data: {
          lastReconciledAt: new Date(),
          reconciliationFailures: { increment: 1 },
        },
      });
      this.logger.warn(
        `Mux reconciliation failed for video ${video.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return "processing" as const;
    }
  }

  private async touchReconciliation(
    videoId: string,
    data: Prisma.VideoAssetUpdateManyMutationInput,
  ) {
    await this.prisma.videoAsset.updateMany({
      where: {
        id: videoId,
        status: { in: [AssetStatus.pending, AssetStatus.processing] },
      },
      data: {
        ...data,
        lastReconciledAt: new Date(),
        reconciliationFailures: 0,
      },
    });
  }

  private async failReconciliation(video: VideoAsset, reason: string) {
    await this.applyReconciledState(
      video,
      {
        status: AssetStatus.failed,
        failureReason: reason,
        lastReconciledAt: new Date(),
      },
      ContentItemStatus.failed,
    );
    return "failed" as const;
  }

  private async applyReconciledState(
    video: VideoAsset,
    data: Prisma.VideoAssetUpdateManyMutationInput,
    contentStatus: ContentItemStatus,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.videoAsset.updateMany({
        where: {
          id: video.id,
          status: { in: [AssetStatus.pending, AssetStatus.processing] },
        },
        data,
      });
      if (updated.count && video.contentItemId) {
        await tx.contentItem.update({
          where: { id: video.contentItemId },
          data: { status: contentStatus },
        });
      }
    });
  }

  private logProviderFailure(videoId: string, reason: string) {
    this.logger.warn(
      `Mux reported a terminal state for video ${videoId}: ${reason}`,
    );
  }

  private async assertPlaybackAccess(user: User, contentItemId: string) {
    if (user.role === UserRole.admin) return;
    if (user.role === UserRole.trainer) {
      const programme = await this.prisma.programme.findFirst({
        where: {
          modules: {
            some: {
              module: {
                contentItems: { some: { contentItemId } },
              },
            },
          },
          AND: {
            modules: {
              some: {
                module: {
                  contentItems: {
                    some: { contentItem: { trainerId: user.id } },
                  },
                },
              },
            },
          },
        },
        select: { id: true },
      });
      if (programme) return;
    }
    if (user.role !== UserRole.entrepreneur) {
      throw new ForbiddenException("You do not have access to this video.");
    }

    const programme = await this.prisma.programme.findFirst({
      where: {
        archivedAt: null,
        publishedAt: { not: null },
        OR: [
          { accessType: ProgrammeAccessType.free },
          {
            accessGrants: {
              some: { entrepreneurUserId: user.id, revokedAt: null },
            },
          },
        ],
        modules: {
          some: {
            module: {
              contentItems: { some: { contentItemId } },
            },
          },
        },
      },
      select: { id: true },
    });
    if (!programme) {
      throw new ForbiddenException("You do not have access to this video.");
    }
  }

  private async findOwnedVideo(user: User, id: string) {
    const video = await this.prisma.videoAsset.findUnique({ where: { id } });
    if (!video) throw new NotFoundException("Video was not found.");
    if (user.role !== UserRole.admin || video.uploadedById !== user.id) {
      throw new ForbiddenException("Video is not in your upload scope.");
    }
    return video;
  }

  private signMuxToken(
    playbackId: string,
    expiresAt: number,
    audience: "v" | "t",
  ) {
    const keyId = this.config.get<string>("MUX_SIGNING_KEY_ID");
    const encodedPrivateKey = this.config.get<string>(
      "MUX_SIGNING_PRIVATE_KEY",
    );
    if (!keyId || !encodedPrivateKey) {
      throw new ServiceUnavailableException(
        "Signed video playback is not configured for this environment.",
      );
    }

    const header = this.base64Url({ alg: "RS256", typ: "JWT", kid: keyId });
    const payload = this.base64Url({
      sub: playbackId,
      aud: audience,
      exp: expiresAt,
      iat: Math.floor(Date.now() / 1000),
    });
    const unsigned = `${header}.${payload}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    const signature = signer.sign(
      Buffer.from(encodedPrivateKey, "base64").toString("utf8"),
      "base64url",
    );
    return `${unsigned}.${signature}`;
  }

  private base64Url(value: object) {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
  }

  private mapVideo(video: VideoAsset) {
    return {
      id: video.id,
      status: video.status,
      durationSeconds: video.duration,
      readyAt: video.readyAt?.toISOString() ?? null,
      failureReason: video.failureReason,
      attached: Boolean(video.contentItemId),
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
    };
  }
}
