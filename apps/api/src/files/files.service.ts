import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus, FileAsset, Prisma, User, UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateDirectUploadDto, FileUploadUsage } from './dto/create-direct-upload.dto';
import { StorageService } from './storage.service';

const allowedMimeTypesByUsage: Record<FileUploadUsage, string[]> = {
  deliverable_submission: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'text/csv',
  ],
  content_pdf: ['application/pdf'],
  tool_pdf: ['application/pdf'],
  report_export: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'],
};

type FileWithAccess = Prisma.FileAssetGetPayload<{
  include: {
    contentItem: true;
    toolPdfAsset: {
      include: {
        entrepreneurAccess: true;
        hiddenEntrepreneurs: true;
        programmeAccess: true;
      };
    };
    deliverableSubmissions: {
      include: {
        instance: {
          include: {
            programme: {
              include: {
                modules: {
                  include: {
                    module: {
                      include: {
                        contentItems: { include: { contentItem: true } };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async createDirectUpload(user: User, dto: CreateDirectUploadDto) {
    await this.ensureCanCreateUpload(user, dto);

    const file = await this.prisma.fileAsset.create({
      data: {
        contentItemId: dto.usage === 'content_pdf' ? dto.contentItemId ?? null : null,
        storageKey: this.storageKey(user, dto),
        originalFilename: dto.originalFilename.trim(),
        mimeType: dto.mimeType,
        sizeBytes: BigInt(dto.sizeBytes),
        status: AssetStatus.pending,
      },
    });

    const upload = this.storage.presign({
      method: 'PUT',
      storageKey: file.storageKey,
      mimeType: file.mimeType,
      expiresInSeconds: 15 * 60,
    });

    return { file: this.mapFile(file), upload };
  }

  async getSignedReadUrl(user: User, fileId: string) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id: fileId },
      include: this.fileAccessInclude(),
    });

    if (!file) throw new NotFoundException('File was not found.');
    if (!(await this.canReadFile(user, file))) {
      throw new ForbiddenException('You do not have access to this file.');
    }

    const download = this.storage.presign({
      method: 'GET',
      storageKey: file.storageKey,
      expiresInSeconds: 5 * 60,
    });

    return { file: this.mapFile(file), download };
  }

  async markReadyForUser(user: User, fileId: string) {
    const file = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('Uploaded file was not found.');
    if (!this.wasUploadedBy(user, file)) {
      throw new ForbiddenException('Uploaded file is not in your upload scope.');
    }

    return this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { status: AssetStatus.ready },
    });
  }

  private async ensureCanCreateUpload(user: User, dto: CreateDirectUploadDto) {
    const allowed = allowedMimeTypesByUsage[dto.usage];
    if (!allowed.includes(dto.mimeType)) {
      throw new BadRequestException('This file type is not supported for that upload.');
    }

    if (dto.usage === 'deliverable_submission' && user.role !== UserRole.entrepreneur) {
      throw new ForbiddenException('Only entrepreneurs can upload deliverable files.');
    }

    if ((dto.usage === 'content_pdf' || dto.usage === 'tool_pdf' || dto.usage === 'report_export') && user.role !== UserRole.admin) {
      throw new ForbiddenException('Only admins can upload this type of file.');
    }

    if (dto.usage === 'content_pdf') {
      if (!dto.contentItemId) throw new BadRequestException('A content item is required for content PDF uploads.');
      const contentItem = await this.prisma.contentItem.findUnique({ where: { id: dto.contentItemId }, select: { id: true, type: true } });
      if (!contentItem) throw new NotFoundException('Content item was not found.');
      if (contentItem.type !== 'pdf') throw new BadRequestException('Only PDF content items can receive PDF uploads.');
    }
  }

  private async canReadFile(user: User, file: FileWithAccess) {
    if (user.role === UserRole.admin) return true;

    if (user.role === UserRole.entrepreneur) {
      if (file.deliverableSubmissions.some((submission) => submission.instance.entrepreneurUserId === user.id)) return true;
      if (!file.toolPdfAsset) return false;

      const hidden = file.toolPdfAsset.hiddenEntrepreneurs.some((entry) => entry.entrepreneurUserId === user.id);
      if (hidden) return false;
      if (file.toolPdfAsset.visibility === 'all_entrepreneurs') return true;
      if (file.toolPdfAsset.entrepreneurAccess.some((entry) => entry.entrepreneurUserId === user.id)) return true;

      const programmeIds = file.toolPdfAsset.programmeAccess.map((access) => access.programmeId);
      if (!programmeIds.length) return false;

      const grant = await this.prisma.programmeAccessGrant.findFirst({
        where: { entrepreneurUserId: user.id, programmeId: { in: programmeIds }, revokedAt: null },
        select: { id: true },
      });
      return Boolean(grant);
    }

    if (user.role === UserRole.trainer) {
      if (file.contentItem?.trainerId === user.id) return true;
      return file.deliverableSubmissions.some((submission) => (
        submission.instance.programme.modules.some((programmeModule) => (
          programmeModule.module.contentItems.some((moduleContent) => moduleContent.contentItem.trainerId === user.id)
        ))
      ));
    }

    return false;
  }

  private fileAccessInclude() {
    return {
      contentItem: true,
      toolPdfAsset: {
        include: {
          entrepreneurAccess: true,
          hiddenEntrepreneurs: true,
          programmeAccess: true,
        },
      },
      deliverableSubmissions: {
        include: {
          instance: {
            include: {
              programme: {
                include: {
                  modules: {
                    include: {
                      module: {
                        include: {
                          contentItems: { include: { contentItem: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.FileAssetInclude;
  }

  private storageKey(user: User, dto: CreateDirectUploadDto) {
    const env = this.config.get<string>('NODE_ENV') ?? 'development';
    const safeName = dto.originalFilename.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload';
    return `uploads/${env}/${dto.usage}/${user.id}/${randomUUID()}-${safeName}`;
  }

  private wasUploadedBy(user: User, file: FileAsset) {
    return file.storageKey.includes(`/${user.id}/`);
  }

  private mapFile(file: FileAsset) {
    return {
      id: file.id,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: Number(file.sizeBytes),
      status: file.status,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    };
  }
}
