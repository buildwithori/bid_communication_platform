import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  AssetStatus,
  FileAssetUsage,
  ReportExportFormat,
  ReportExportStatus,
  User,
} from "@prisma/client";
import type { Queue } from "bullmq";
import * as ExcelJS from "exceljs";
import { PrismaService } from "../database/prisma.service";
import { FilesService } from "../files/files.service";
import { StorageService } from "../files/storage.service";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs/jobs.constants";
import { CreateReportExportDto } from "./dto/reporting-query.dto";
import { ReportingService } from "./reporting.service";

const MIME_TYPES: Record<ReportExportFormat, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

@Injectable()
export class ReportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reporting: ReportingService,
    private readonly storage: StorageService,
    private readonly files: FilesService,
    @InjectQueue(QUEUE_NAMES.reportExports)
    private readonly queue: Queue,
  ) {}

  async create(user: User, dto: CreateReportExportDto) {
    const period = this.reporting.resolvePeriod(dto);
    if (dto.programmeId) {
      const exists = await this.prisma.programme.count({
        where: { id: dto.programmeId },
      });
      if (!exists) throw new BadRequestException("Programme was not found.");
    }
    const report = await this.prisma.reportExport.create({
      data: {
        requestedById: user.id,
        programmeId: dto.programmeId ?? null,
        format: dto.format,
        dateFrom: period.from,
        dateTo: period.to,
      },
      include: { programme: { select: { name: true } } },
    });
    try {
      await this.queue.add(
        JOB_NAMES.generateReportExport,
        { reportExportId: report.id },
        {
          jobId: `report-export-${report.id}`,
          attempts: 5,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: { age: 86_400, count: 1_000 },
        },
      );
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Queue unavailable";
      await this.prisma.reportExport.update({
        where: { id: report.id },
        data: { status: ReportExportStatus.failed, failureReason: reason },
      });
      throw new ServiceUnavailableException(
        "The report export queue is temporarily unavailable.",
      );
    }
    return this.map(report);
  }

  async get(user: User, id: string) {
    const report = await this.prisma.reportExport.findFirst({
      where: { id, requestedById: user.id },
      include: { programme: { select: { name: true } } },
    });
    if (!report) throw new NotFoundException("Report export was not found.");
    return this.map(report);
  }

  async download(user: User, id: string) {
    const report = await this.prisma.reportExport.findFirst({
      where: { id, requestedById: user.id },
      select: { status: true, fileAssetId: true },
    });
    if (!report) throw new NotFoundException("Report export was not found.");
    if (report.status !== ReportExportStatus.ready || !report.fileAssetId) {
      throw new BadRequestException("Report export is not ready to download.");
    }
    return this.files.getSignedReadUrl(user, report.fileAssetId);
  }

  async process(reportExportId: string) {
    const claimed = await this.prisma.reportExport.updateMany({
      where: {
        id: reportExportId,
        status: {
          in: [
            ReportExportStatus.queued,
            ReportExportStatus.failed,
            ReportExportStatus.processing,
          ],
        },
        fileAssetId: null,
      },
      data: {
        status: ReportExportStatus.processing,
        startedAt: new Date(),
        failureReason: null,
        attemptCount: { increment: 1 },
      },
    });
    if (!claimed.count) {
      const existing = await this.prisma.reportExport.findUnique({
        where: { id: reportExportId },
        select: { status: true },
      });
      if (existing?.status === ReportExportStatus.ready) {
        return { status: "already_ready" as const };
      }
      throw new Error(
        "Report export is already being processed or no longer exists.",
      );
    }

    try {
      const report = await this.prisma.reportExport.findUniqueOrThrow({
        where: { id: reportExportId },
        include: { programme: { select: { name: true } } },
      });
      const query = {
        programmeId: report.programmeId ?? undefined,
        dateFrom: report.dateFrom.toISOString(),
        dateTo: report.dateTo.toISOString(),
      };
      const overview = await this.reporting.overview(query);
      const overdue = [];
      let cursor: string | undefined;
      do {
        const page = await this.reporting.overdueUpdates({
          programmeId: report.programmeId ?? undefined,
          take: 100,
          cursor,
        });
        overdue.push(...page.items);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);

      const body =
        report.format === ReportExportFormat.csv
          ? this.csv(overview, overdue)
          : await this.xlsx(overview, overdue);
      const filename = this.filename(
        report.programme?.name ?? "all-programmes",
        report.format,
        report.createdAt,
      );
      const storageKey = `report-exports/${report.requestedById}/${report.id}/${filename}`;
      const mimeType = MIME_TYPES[report.format];
      await this.storage.putObject(storageKey, mimeType, body);

      await this.prisma.$transaction(async (tx) => {
        const file = await tx.fileAsset.create({
          data: {
            storageKey,
            originalFilename: filename,
            mimeType,
            sizeBytes: BigInt(body.byteLength),
            status: AssetStatus.ready,
            usage: FileAssetUsage.report_export,
            uploadedById: report.requestedById,
            verifiedAt: new Date(),
          },
        });
        await tx.reportExport.update({
          where: { id: report.id },
          data: {
            status: ReportExportStatus.ready,
            fileAssetId: file.id,
            completedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 86_400_000),
            failureReason: null,
          },
        });
      });
      return { status: "ready" as const };
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Unknown export error";
      await this.prisma.reportExport.updateMany({
        where: {
          id: reportExportId,
          status: ReportExportStatus.processing,
        },
        data: {
          status: ReportExportStatus.failed,
          failureReason: reason,
        },
      });
      throw error;
    }
  }

  private csv(
    overview: Awaited<ReturnType<ReportingService["overview"]>>,
    overdue: Awaited<ReturnType<ReportingService["overdueUpdates"]>>["items"],
  ) {
    const rows: Array<Array<string | number>> = [
      ["BID Hub reporting export"],
      ["Period from", overview.period.from],
      ["Period to", overview.period.to],
      ["Programme", overview.scope.programmeName],
      ["Currency", overview.settings.currency],
      [],
      ["Summary"],
      ["Jobs created", overview.metrics.jobsCreated],
      ["Jobs created for women", overview.metrics.jobsWomen],
      ["Jobs created for men", overview.metrics.jobsMen],
      ["Funds mobilised", overview.metrics.fundsMobilisedCents / 100],
      ["Entrepreneurs with funds", overview.metrics.entrepreneursWithFunds],
      ["Update submission rate", `${overview.metrics.updateSubmissionRate}%`],
      [
        "Training completion rate",
        `${overview.metrics.trainingCompletionRate}%`,
      ],
      ["Overdue entrepreneurs", overview.metrics.overdueEntrepreneurs],
      [],
      ["Jobs by programme"],
      ["Programme", "Jobs"],
      ...overview.jobsByProgramme.map((item) => [
        item.programmeName,
        item.value,
      ]),
      [],
      ["Funds by programme"],
      ["Programme", `Funds (${overview.settings.currency})`],
      ...overview.fundsByProgramme.map((item) => [
        item.programmeName,
        item.value / 100,
      ]),
      [],
      ["Overdue updates"],
      [
        "Business",
        "Representative",
        "Email",
        "Programme access",
        "Last submitted",
        "Days without report",
        "Days overdue",
        "Priority",
      ],
      ...overdue.map((item) => [
        item.businessName,
        item.representativeName,
        item.email,
        item.programmes.map((programme) => programme.name).join("; "),
        item.lastReport?.submittedAt ?? "Never",
        item.daysWithoutReport,
        item.daysOverdue,
        item.priority,
      ]),
    ];
    return Buffer.from(
      rows
        .map((row) => row.map((cell) => this.csvCell(cell)).join(","))
        .join("\r\n"),
      "utf8",
    );
  }

  private async xlsx(
    overview: Awaited<ReturnType<ReportingService["overview"]>>,
    overdue: Awaited<ReturnType<ReportingService["overdueUpdates"]>>["items"],
  ) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BID Hub";
    workbook.created = new Date();

    const summary = workbook.addWorksheet("Summary");
    summary.addRows([
      ["BID Hub reporting export"],
      ["Period from", overview.period.from],
      ["Period to", overview.period.to],
      ["Programme", overview.scope.programmeName],
      ["Currency", overview.settings.currency],
      [],
      ["Metric", "Value"],
      ["Jobs created", overview.metrics.jobsCreated],
      ["Jobs created for women", overview.metrics.jobsWomen],
      ["Jobs created for men", overview.metrics.jobsMen],
      ["Funds mobilised", overview.metrics.fundsMobilisedCents / 100],
      ["Entrepreneurs with funds", overview.metrics.entrepreneursWithFunds],
      ["Update submission rate", overview.metrics.updateSubmissionRate / 100],
      [
        "Training completion rate",
        overview.metrics.trainingCompletionRate / 100,
      ],
      ["Overdue entrepreneurs", overview.metrics.overdueEntrepreneurs],
    ]);
    summary.getRow(1).font = {
      bold: true,
      size: 16,
      color: { argb: "FF842751" },
    };
    summary.getRow(7).font = { bold: true };
    summary.getCell("B13").numFmt = "0%";
    summary.getCell("B14").numFmt = "0%";
    summary.columns = [{ width: 34 }, { width: 28 }];

    const breakdown = workbook.addWorksheet("Programme breakdown");
    breakdown.addRow([
      "Programme",
      "Jobs created",
      `Funds (${overview.settings.currency})`,
    ]);
    const fundById = new Map(
      overview.fundsByProgramme.map((item) => [item.programmeId, item.value]),
    );
    const ids = new Set([
      ...overview.jobsByProgramme.map((item) => item.programmeId),
      ...overview.fundsByProgramme.map((item) => item.programmeId),
    ]);
    for (const id of ids) {
      const jobs = overview.jobsByProgramme.find(
        (item) => item.programmeId === id,
      );
      const funds = overview.fundsByProgramme.find(
        (item) => item.programmeId === id,
      );
      breakdown.addRow([
        jobs?.programmeName ?? funds?.programmeName ?? "Unknown",
        jobs?.value ?? 0,
        (fundById.get(id) ?? 0) / 100,
      ]);
    }
    breakdown.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    breakdown.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF842751" },
    };
    breakdown.columns = [{ width: 42 }, { width: 18 }, { width: 22 }];

    const followUp = workbook.addWorksheet("Overdue updates");
    followUp.addRow([
      "Business",
      "Representative",
      "Email",
      "Programme access",
      "Last submitted",
      "Days without report",
      "Days overdue",
      "Priority",
    ]);
    for (const item of overdue) {
      followUp.addRow([
        item.businessName,
        item.representativeName,
        item.email,
        item.programmes.map((programme) => programme.name).join("; "),
        item.lastReport?.submittedAt ?? "Never",
        item.daysWithoutReport,
        item.daysOverdue,
        item.priority,
      ]);
    }
    followUp.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    followUp.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF842751" },
    };
    followUp.views = [{ state: "frozen", ySplit: 1 }];
    followUp.autoFilter = { from: "A1", to: "H1" };
    followUp.columns = [
      { width: 28 },
      { width: 24 },
      { width: 30 },
      { width: 38 },
      { width: 24 },
      { width: 20 },
      { width: 15 },
      { width: 18 },
    ];
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private filename(scope: string, format: ReportExportFormat, createdAt: Date) {
    const slug = scope
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    return `bid-report-${slug || "all-programmes"}-${createdAt.toISOString().slice(0, 10)}.${format}`;
  }

  private csvCell(value: string | number) {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private map(report: {
    id: string;
    format: ReportExportFormat;
    status: ReportExportStatus;
    programmeId: string | null;
    programme: { name: string } | null;
    dateFrom: Date;
    dateTo: Date;
    fileAssetId: string | null;
    failureReason: string | null;
    createdAt: Date;
    completedAt: Date | null;
    expiresAt: Date | null;
  }) {
    return {
      id: report.id,
      format: report.format,
      status: report.status,
      programmeId: report.programmeId,
      programmeName: report.programme?.name ?? null,
      dateFrom: report.dateFrom.toISOString(),
      dateTo: report.dateTo.toISOString(),
      fileAssetId: report.fileAssetId,
      failureReason: report.failureReason,
      createdAt: report.createdAt.toISOString(),
      completedAt: report.completedAt?.toISOString() ?? null,
      expiresAt: report.expiresAt?.toISOString() ?? null,
    };
  }
}
