import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  AssetStatus,
  ContentItemStatus,
  FileAsset,
  Prisma,
  ProgrammeAccessType,
  User,
  UserRole,
} from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import {
  CreateDirectUploadDto,
  FileUploadUsage,
} from "./dto/create-direct-upload.dto";
import { matchesFileSignature } from "./file-signature";
import { StorageService } from "./storage.service";
import { WorkbookPreviewQueryDto } from "./dto/workbook-preview-query.dto";
import * as ExcelJS from "exceljs";

function excelColumnLabel(index: number) {
  let value = index;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

const allowedMimeTypesByUsage: Record<FileUploadUsage, string[]> = {
  deliverable_submission: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "text/csv",
  ],
  content_pdf: ["application/pdf"],
  content_excel: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  tool_pdf: ["application/pdf"],
  tool_excel: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  report_export: [
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/pdf",
  ],
};

type FileWithAccess = Prisma.FileAssetGetPayload<{
  include: {
    contentItem: true;
    toolFileAsset: {
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
  private readonly workbookCache = new Map<
    string,
    {
      updatedAt: number;
      expiresAt: number;
      workbook: Promise<ExcelJS.Workbook>;
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async createDirectUpload(user: User, dto: CreateDirectUploadDto) {
    await this.ensureCanCreateUpload(user, dto);

    const storageKey = this.storageKey(user, dto);
    const upload = this.storage.presign({
      method: "PUT",
      storageKey,
      mimeType: dto.mimeType,
      expiresInSeconds: 15 * 60,
    });

    const file = await this.prisma.fileAsset.create({
      data: {
        contentItemId:
          dto.usage === "content_pdf" || dto.usage === "content_excel"
            ? (dto.contentItemId ?? null)
            : null,
        storageKey,
        originalFilename: dto.originalFilename.trim(),
        mimeType: dto.mimeType,
        sizeBytes: BigInt(dto.sizeBytes),
        status: AssetStatus.pending,
        usage: dto.usage,
        uploadedById: user.id,
      },
    });

    return { file: this.mapFile(file), upload };
  }

  async getSignedReadUrl(user: User, fileId: string) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id: fileId },
      include: this.fileAccessInclude(),
    });

    if (!file) throw new NotFoundException("File was not found.");
    if (!(await this.canReadFile(user, file))) {
      throw new ForbiddenException("You do not have access to this file.");
    }
    if (file.status !== AssetStatus.ready) {
      throw new BadRequestException("File is not ready to download.");
    }

    const download = this.storage.presign({
      method: "GET",
      storageKey: file.storageKey,
      expiresInSeconds: 5 * 60,
    });

    return { file: this.mapFile(file), download };
  }

  async getWorkbookPreview(
    user: User,
    fileId: string,
    query: WorkbookPreviewQueryDto,
  ) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id: fileId },
      include: this.fileAccessInclude(),
    });
    if (!file) throw new NotFoundException("Workbook was not found.");
    if (!(await this.canReadFile(user, file))) {
      throw new ForbiddenException("You do not have access to this workbook.");
    }
    if (file.status !== AssetStatus.ready) {
      throw new BadRequestException("Workbook is not ready to preview.");
    }
    if (
      file.mimeType !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      throw new BadRequestException("This file is not an Excel workbook.");
    }

    const workbook = await this.loadWorkbook(file);
    const worksheets = workbook.worksheets.map((worksheet) => ({
      name: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: worksheet.columnCount,
    }));
    const worksheet = query.sheet
      ? workbook.getWorksheet(query.sheet)
      : workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException(
        query.sheet
          ? "The selected worksheet was not found."
          : "This workbook does not contain any worksheets.",
      );
    }

    const rowStart = query.rowStart ?? 1;
    const columnStart = query.columnStart ?? 1;
    const rowTake = query.rowTake ?? 100;
    const columnTake = query.columnTake ?? 20;
    const rowEnd = Math.min(
      Math.max(worksheet.rowCount, 1),
      rowStart + rowTake - 1,
    );
    const columnEnd = Math.min(
      Math.max(worksheet.columnCount, 1),
      columnStart + columnTake - 1,
    );
    const rows = [];
    for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
      const row = worksheet.getRow(rowIndex);
      rows.push({
        index: rowIndex,
        cells: Array.from(
          { length: Math.max(columnEnd - columnStart + 1, 0) },
          (_, offset) => row.getCell(columnStart + offset).text,
        ),
      });
    }

    return {
      file: this.mapFile(file),
      workbook: { sheets: worksheets, activeSheet: worksheet.name },
      window: {
        rowStart,
        rowEnd,
        columnStart,
        columnEnd,
        rowTake,
        columnTake,
        nextRowStart: rowEnd < worksheet.rowCount ? rowEnd + 1 : null,
        previousColumnStart:
          columnStart > 1 ? Math.max(1, columnStart - columnTake) : null,
        nextColumnStart:
          columnEnd < worksheet.columnCount ? columnEnd + 1 : null,
      },
      columns: Array.from(
        { length: Math.max(columnEnd - columnStart + 1, 0) },
        (_, offset) => ({
          index: columnStart + offset,
          label: excelColumnLabel(columnStart + offset),
        }),
      ),
      rows,
    };
  }

  async completeDirectUpload(user: User, fileId: string) {
    const file = await this.markReadyForUser(user, fileId);
    return this.mapFile(file);
  }

  async markReadyForUser(
    user: User,
    fileId: string,
    expectedUsage?: FileUploadUsage,
  ) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id: fileId },
    });
    if (!file) throw new NotFoundException("Uploaded file was not found.");
    if (!this.wasUploadedBy(user, file)) {
      throw new ForbiddenException(
        "Uploaded file is not in your upload scope.",
      );
    }
    if (expectedUsage && file.usage !== expectedUsage) {
      throw new BadRequestException(
        "Uploaded file is not valid for this operation.",
      );
    }
    if (file.status === AssetStatus.ready) return file;

    await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { status: AssetStatus.processing, failureReason: null },
    });

    const stored = await this.storage.statObject(file.storageKey);
    if (!stored) {
      return this.failVerification(
        fileId,
        "The uploaded object was not found.",
      );
    }
    if (stored.sizeBytes !== Number(file.sizeBytes)) {
      return this.failVerification(
        fileId,
        "The uploaded file size does not match the request.",
      );
    }
    if (stored.mimeType !== file.mimeType.toLowerCase()) {
      return this.failVerification(
        fileId,
        "The uploaded file type does not match the request.",
      );
    }
    const prefix = await this.storage.readObjectPrefix(file.storageKey);
    if (!matchesFileSignature(file.mimeType, prefix)) {
      return this.failVerification(
        fileId,
        "The uploaded file content does not match its type.",
      );
    }

    return this.audit.capture(
      {
        action: "files.upload.completed",
        entityType: "fileAsset",
        entityId: ({ id }) => id,
        summary: `Verified upload ${file.originalFilename}`,
        payload: {
          usage: file.usage,
          mimeType: file.mimeType,
          sizeBytes: Number(file.sizeBytes),
        },
      },
      (tx) =>
        tx.fileAsset.update({
          where: { id: fileId },
          data: {
            status: AssetStatus.ready,
            verifiedAt: new Date(),
            failureReason: null,
          },
        }),
    );
  }

  private async loadWorkbook(
    file: Pick<FileAsset, "id" | "storageKey" | "updatedAt">,
  ) {
    const now = Date.now();
    const version = file.updatedAt.getTime();
    const cached = this.workbookCache.get(file.id);
    if (cached && cached.updatedAt === version && cached.expiresAt > now) {
      return cached.workbook;
    }
    if (cached) this.workbookCache.delete(file.id);
    while (this.workbookCache.size >= 6) {
      const oldestKey = this.workbookCache.keys().next().value as
        string | undefined;
      if (!oldestKey) break;
      this.workbookCache.delete(oldestKey);
    }
    const workbook = (async () => {
      const bytes = await this.storage.readObject(
        file.storageKey,
        25 * 1024 * 1024,
      );
      const next = new ExcelJS.Workbook();
      try {
        await next.xlsx.load(Buffer.from(bytes));
      } catch {
        throw new BadRequestException(
          "The workbook could not be read. Upload a valid .xlsx file.",
        );
      }
      return next;
    })();
    this.workbookCache.set(file.id, {
      updatedAt: version,
      expiresAt: now + 5 * 60 * 1000,
      workbook,
    });
    try {
      return await workbook;
    } catch (error) {
      this.workbookCache.delete(file.id);
      throw error;
    }
  }

  private async failVerification(
    fileId: string,
    reason: string,
  ): Promise<never> {
    await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { status: AssetStatus.failed, failureReason: reason },
    });
    throw new UnprocessableEntityException(reason);
  }

  private async ensureCanCreateUpload(user: User, dto: CreateDirectUploadDto) {
    const allowed = allowedMimeTypesByUsage[dto.usage];
    if (!allowed.includes(dto.mimeType)) {
      throw new BadRequestException(
        "This file type is not supported for that upload.",
      );
    }

    if (
      dto.usage === "deliverable_submission" &&
      user.role !== UserRole.entrepreneur
    ) {
      throw new ForbiddenException(
        "Only entrepreneurs can upload deliverable files.",
      );
    }

    if (
      (dto.usage === "content_pdf" ||
        dto.usage === "content_excel" ||
        dto.usage === "tool_pdf" ||
        dto.usage === "tool_excel" ||
        dto.usage === "report_export") &&
      user.role !== UserRole.admin
    ) {
      throw new ForbiddenException("Only admins can upload this type of file.");
    }

    if (
      (dto.usage === "content_pdf" || dto.usage === "content_excel") &&
      dto.contentItemId
    ) {
      const contentItem = await this.prisma.contentItem.findUnique({
        where: { id: dto.contentItemId },
        select: { id: true, type: true },
      });
      if (!contentItem)
        throw new NotFoundException("Content item was not found.");
      const expectedType = dto.usage === "content_excel" ? "excel" : "pdf";
      if (contentItem.type !== expectedType) {
        throw new BadRequestException(
          "Only " +
            expectedType.toUpperCase() +
            " content items can receive this upload.",
        );
      }
    }
  }

  private async canReadFile(user: User, file: FileWithAccess) {
    if (user.role === UserRole.admin) return true;

    if (user.role === UserRole.entrepreneur) {
      if (
        file.deliverableSubmissions.some(
          (submission) => submission.instance.entrepreneurUserId === user.id,
        )
      )
        return true;
      if (file.contentItem) {
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
                  contentItems: {
                    some: {
                      contentItemId: file.contentItem.id,
                      contentItem: { status: ContentItemStatus.ready },
                    },
                  },
                },
              },
            },
          },
          select: { id: true },
        });
        if (programme) return true;
      }
      if (!file.toolFileAsset) return false;

      const hidden = file.toolFileAsset.hiddenEntrepreneurs.some(
        (entry) => entry.entrepreneurUserId === user.id,
      );
      if (hidden) return false;

      const linkedProgramme = await this.prisma.programme.findFirst({
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
                contentItems: {
                  some: {
                    contentItem: {
                      status: ContentItemStatus.ready,
                      toolLink: { is: { toolId: file.toolFileAsset.id } },
                    },
                  },
                },
              },
            },
          },
        },
        select: { id: true },
      });
      if (linkedProgramme) return true;
      if (file.toolFileAsset.visibility === "all_entrepreneurs") return true;
      if (
        file.toolFileAsset.entrepreneurAccess.some(
          (entry) => entry.entrepreneurUserId === user.id,
        )
      )
        return true;

      const programmeIds = file.toolFileAsset.programmeAccess.map(
        (access) => access.programmeId,
      );
      if (!programmeIds.length) return false;

      const grant = await this.prisma.programmeAccessGrant.findFirst({
        where: {
          entrepreneurUserId: user.id,
          programmeId: { in: programmeIds },
          revokedAt: null,
        },
        select: { id: true },
      });
      return Boolean(grant);
    }

    if (user.role === UserRole.trainer) {
      if (file.contentItem) {
        const programme = await this.prisma.programme.findFirst({
          where: {
            modules: {
              some: {
                module: {
                  contentItems: {
                    some: { contentItemId: file.contentItem.id },
                  },
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
        if (programme) return true;
      }
      if (file.toolFileAsset) {
        const linkedProgramme = await this.prisma.programme.findFirst({
          where: {
            modules: {
              some: {
                module: {
                  contentItems: {
                    some: {
                      contentItem: {
                        status: ContentItemStatus.ready,
                        toolLink: { is: { toolId: file.toolFileAsset.id } },
                      },
                    },
                  },
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
        if (linkedProgramme) return true;
      }
      return file.deliverableSubmissions.some((submission) =>
        submission.instance.programme.modules.some((programmeModule) =>
          programmeModule.module.contentItems.some(
            (moduleContent) => moduleContent.contentItem.trainerId === user.id,
          ),
        ),
      );
    }

    return false;
  }

  private fileAccessInclude() {
    return {
      contentItem: true,
      toolFileAsset: {
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
    const env = this.config.get<string>("NODE_ENV") ?? "development";
    const safeName =
      dto.originalFilename
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "upload";
    return `uploads/${env}/${dto.usage}/${user.id}/${randomUUID()}-${safeName}`;
  }

  private wasUploadedBy(user: User, file: FileAsset) {
    return (
      file.uploadedById === user.id ||
      (!file.uploadedById && file.storageKey.includes(`/${user.id}/`))
    );
  }

  private mapFile(file: FileAsset) {
    return {
      id: file.id,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: Number(file.sizeBytes),
      status: file.status,
      usage: file.usage,
      verifiedAt: file.verifiedAt?.toISOString() ?? null,
      failureReason: file.failureReason,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    };
  }
}
