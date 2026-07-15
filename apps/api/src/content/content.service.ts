import {
  ForbiddenException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus, ContentItemStatus, ContentItemType, FileAssetUsage, ToolLinkSource, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UpsertContentRatingDto } from './dto/upsert-content-rating.dto';
import { CreateContentItemDto } from './dto/create-content-item.dto';
import { FilesService } from '../files/files.service';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}


  async createModuleContentItem(user: User, moduleId: string, input: CreateContentItemDto) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException('Only admins can create programme content.');
    }

    const module = await this.prisma.learningModule.findUnique({ where: { id: moduleId }, select: { id: true } });
    if (!module) throw new NotFoundException('Module was not found.');

    await this.ensureTrainerExists(input.trainerId);
    if (input.type === ContentItemType.tool) await this.ensureToolSource(input);
    const pdfAsset = input.type === ContentItemType.pdf
      ? await this.filesService.markReadyForUser(user, input.fileAssetId as string, FileAssetUsage.content_pdf)
      : null;
    const videoAsset = input.type === ContentItemType.video
      ? await this.ensureVideoAsset(user, input.videoAssetId as string)
      : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const maxPosition = await tx.moduleContentItem.aggregate({
        where: { moduleId },
        _max: { position: true },
      });
      const position = (maxPosition._max.position ?? 0) + 1;

      const contentItem = await tx.contentItem.create({
        data: {
          title: input.title.trim(),
          type: input.type,
          trainerId: input.trainerId || null,
          durationSeconds: input.durationSeconds ?? null,
          status: this.initialContentStatus(input, videoAsset?.status),
        },
      });

      if (videoAsset) {
        const attached = await tx.videoAsset.updateMany({
          where: { id: videoAsset.id, contentItemId: null },
          data: { contentItemId: contentItem.id },
        });
        if (attached.count !== 1) {
          throw new BadRequestException('This video upload is already attached.');
        }
      }

      if (pdfAsset) {
        await tx.fileAsset.update({
          where: { id: pdfAsset.id },
          data: { contentItemId: contentItem.id, status: AssetStatus.ready },
        });
      }

      if (input.type === ContentItemType.tool) {
        await tx.contentToolLink.create({
          data: {
            contentItemId: contentItem.id,
            toolId: input.toolId || null,
            externalUrl: input.externalUrl?.trim() || null,
            source: input.toolId ? ToolLinkSource.library : ToolLinkSource.custom,
          },
        });
      }

      await tx.moduleContentItem.create({
        data: { moduleId, contentItemId: contentItem.id, position },
      });

      return tx.contentItem.findUniqueOrThrow({
        where: { id: contentItem.id },
        include: {
          trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
          videoAsset: true,
          fileAssets: true,
          toolLink: { include: { tool: true } },
          modules: { select: { moduleId: true, position: true } },
        },
      });
    });

    return this.serializeContentItem(created);
  }

  async getMyRating(user: User, contentItemId: string) {
    this.assertEntrepreneur(user);

    const rating = await this.prisma.contentRating.findUnique({
      where: {
        contentItemId_entrepreneurUserId: {
          contentItemId,
          entrepreneurUserId: user.id,
        },
      },
    });

    return rating ? this.serializeRating(rating) : null;
  }

  async upsertRating(user: User, input: UpsertContentRatingDto) {
    this.assertEntrepreneur(user);

    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: input.contentItemId },
      select: { id: true, trainerId: true },
    });

    if (!contentItem) {
      throw new NotFoundException('Content item not found.');
    }

    const comment = input.comment?.trim() || null;
    const rating = await this.prisma.contentRating.upsert({
      where: {
        contentItemId_entrepreneurUserId: {
          contentItemId: input.contentItemId,
          entrepreneurUserId: user.id,
        },
      },
      create: {
        contentItemId: input.contentItemId,
        entrepreneurUserId: user.id,
        trainerId: contentItem.trainerId,
        rating: input.rating,
        comment,
      },
      update: {
        trainerId: contentItem.trainerId,
        rating: input.rating,
        comment,
      },
    });

    return this.serializeRating(rating);
  }


  private async ensureTrainerExists(trainerId?: string) {
    if (!trainerId) return;
    const trainer = await this.prisma.user.findFirst({
      where: { id: trainerId, role: UserRole.trainer },
      select: { id: true },
    });
    if (!trainer) throw new NotFoundException('Trainer was not found.');
  }

  private async ensureVideoAsset(user: User, videoAssetId: string) {
    const video = await this.prisma.videoAsset.findUnique({
      where: { id: videoAssetId },
    });
    if (!video) throw new NotFoundException('Uploaded video was not found.');
    if (video.uploadedById !== user.id || video.contentItemId) {
      throw new ForbiddenException('Uploaded video is not in your upload scope.');
    }
    if (
      video.status === AssetStatus.failed ||
      video.status === AssetStatus.archived
    ) {
      throw new BadRequestException(
        'Upload a valid video before creating this content item.',
      );
    }
    return video;
  }

  private async ensureToolSource(input: CreateContentItemDto) {
    if (input.toolId) {
      const tool = await this.prisma.tool.findUnique({ where: { id: input.toolId }, select: { id: true, type: true, embeddedUrl: true } });
      if (!tool) throw new NotFoundException('Tool was not found.');
      if (tool.type !== 'embedded_tool' || !tool.embeddedUrl) {
        throw new ForbiddenException('Only embedded tools can be attached to learning content.');
      }
      return;
    }

    if (!input.externalUrl?.trim()) {
      throw new ForbiddenException('Choose an existing tool or add an embedded tool link.');
    }
  }

  private initialContentStatus(
    input: CreateContentItemDto,
    videoStatus?: AssetStatus,
  ) {
    if (input.type === ContentItemType.video) {
      if (videoStatus === AssetStatus.ready) return ContentItemStatus.ready;
      if (videoStatus === AssetStatus.failed) return ContentItemStatus.failed;
      return ContentItemStatus.processing;
    }
    return ContentItemStatus.ready;
  }

  private serializeContentItem(item: {
    id: string;
    title: string;
    type: ContentItemType;
    trainerId: string | null;
    durationSeconds: number | null;
    status: ContentItemStatus;
    createdAt: Date;
    updatedAt: Date;
    trainer: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
    videoAsset: { id: string; duration: number | null; status: AssetStatus } | null;
    fileAssets: Array<{ id: string; originalFilename: string; mimeType: string; sizeBytes: bigint; status: AssetStatus }>;
    toolLink: { id: string; toolId: string | null; externalUrl: string | null; source: ToolLinkSource; tool: { id: string; name: string; embeddedUrl: string | null } | null } | null;
    modules: Array<{ moduleId: string; position: number }>;
  }) {
    const file = item.fileAssets[0] ?? null;
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      trainerId: item.trainerId,
      trainer: item.trainer ? this.serializeUser(item.trainer) : null,
      durationSeconds: item.durationSeconds,
      durationLabel: item.durationSeconds ? `${Math.round(item.durationSeconds / 60)} min` : null,
      status: item.status,
      video: item.videoAsset ? {
        id: item.videoAsset.id,
        durationSeconds: item.videoAsset.duration,
        status: item.videoAsset.status,
      } : null,
      file: file ? {
        id: file.id,
        originalFilename: file.originalFilename,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        status: file.status,
      } : null,
      toolLink: item.toolLink ? {
        id: item.toolLink.id,
        toolId: item.toolLink.toolId,
        externalUrl: item.toolLink.externalUrl,
        source: item.toolLink.source,
        toolName: item.toolLink.tool?.name ?? null,
        url: item.toolLink.tool?.embeddedUrl ?? item.toolLink.externalUrl,
      } : null,
      modules: item.modules,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private serializeUser(user: { id: string; firstName: string | null; lastName: string | null; email: string }) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    return { id: user.id, name, email: user.email };
  }

  private assertEntrepreneur(user: User) {
    if (user.role !== UserRole.entrepreneur) {
      throw new ForbiddenException(
        'Only entrepreneurs can rate learning content.',
      );
    }
  }

  private serializeRating(rating: {
    id: string;
    contentItemId: string;
    entrepreneurUserId: string;
    trainerId: string | null;
    rating: number;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: rating.id,
      contentItemId: rating.contentItemId,
      entrepreneurUserId: rating.entrepreneurUserId,
      trainerId: rating.trainerId,
      rating: rating.rating,
      comment: rating.comment,
      createdAt: rating.createdAt.toISOString(),
      updatedAt: rating.updatedAt.toISOString(),
    };
  }
}
