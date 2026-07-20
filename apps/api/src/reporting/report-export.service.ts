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
import { AuditService } from "../audit/audit.service";
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
    private readonly audit: AuditService,
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
    const report = await this.audit.capture(
      {
        action: "reports.export.requested",
        entityType: "reportExport",
        entityId: (result) => result.id,
        summary: "Requested reporting export",
        payload: {
          format: dto.format,
          programmeId: dto.programmeId ?? null,
          dateFrom: period.from.toISOString(),
          dateTo: period.to.toISOString(),
        },
      },
      (tx) =>
        tx.reportExport.create({
          data: {
            requestedById: user.id,
            programmeId: dto.programmeId ?? null,
            format: dto.format,
            dateFrom: period.from,
            dateTo: period.to,
          },
          include: { programme: { select: { name: true } } },
        }),
    );
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
    const generatedAt = new Date();
    const rows: Array<Array<string | number>> = [
      ["BID Hub impact and performance report"],
      ["Generated", this.dateTime(generatedAt)],
      [
        "Reporting period",
        this.shortDate(overview.period.from) +
          " to " +
          this.shortDate(overview.period.to),
      ],
      ["Programme scope", overview.scope.programmeName],
      ["Reporting currency", overview.settings.currency],
      [],
      ["Executive summary"],
      ["Metric", "Value", "Context"],
      [
        "Jobs created",
        overview.metrics.jobsCreated,
        "Periodic updates overlapping the reporting period",
      ],
      [
        "Jobs created for women",
        overview.metrics.jobsWomen,
        "Reported jobs for women",
      ],
      [
        "Jobs created for men",
        overview.metrics.jobsMen,
        "Reported jobs for men",
      ],
      [
        "Funds mobilised",
        overview.metrics.fundsMobilisedCents / 100,
        overview.settings.currency,
      ],
      [
        "Entrepreneurs with funds",
        overview.metrics.entrepreneursWithFunds,
        "Distinct entrepreneurs in the reporting period",
      ],
      [
        "Update submission rate",
        overview.metrics.updateSubmissionRate + "%",
        overview.metrics.submittedEntrepreneurs +
          " of " +
          overview.metrics.totalEntrepreneurs +
          " eligible entrepreneurs",
      ],
      [
        "Training completion rate",
        overview.metrics.trainingCompletionRate + "%",
        "Average programme learning progress",
      ],
      [
        "Overdue entrepreneurs",
        overview.metrics.overdueEntrepreneurs,
        "Current follow-up position as at generation time",
      ],
      [],
      ["Programme performance"],
      [
        "Programme",
        "Jobs created",
        "Funds mobilised (" + overview.settings.currency + ")",
      ],
      ...this.programmeRows(overview),
      [
        "Total",
        overview.metrics.jobsCreated,
        overview.metrics.fundsMobilisedCents / 100,
      ],
      [],
      ["Overdue periodic updates"],
      [
        "Business",
        "Representative",
        "Email",
        "Programme access",
        "Last reporting period",
        "Last submitted",
        "Joined BID Hub",
        "Days without report",
        "Days overdue",
        "Priority",
      ],
      ...overdue.map((item) => [
        item.businessName,
        item.representativeName,
        item.email,
        item.programmes.map((programme) => programme.name).join("; ") ||
          "No assigned programme",
        item.lastReport
          ? this.shortDate(item.lastReport.periodStart) +
            " to " +
            this.shortDate(item.lastReport.periodEnd)
          : "Never submitted",
        item.lastReport
          ? this.dateTime(item.lastReport.submittedAt)
          : "Never submitted",
        this.shortDate(item.joinedAt),
        item.daysWithoutReport,
        item.daysOverdue,
        this.priorityLabel(item.priority),
      ]),
      [],
      ["Methodology and interpretation"],
      ["Jobs", overview.sources.jobs],
      ["Funds", overview.sources.funds],
      [
        "Overdue follow-up",
        overview.sources.overdue +
          " The overdue list is current at export generation time and is not limited to the selected reporting period.",
      ],
      [
        "Unattributed activity",
        "Records without a programme remain company-wide and are not assigned to a programme result.",
      ],
    ];
    const content = rows
      .map((row) => row.map((cell) => this.csvCell(cell)).join(","))
      .join("\r\n");
    return Buffer.from("\uFEFF" + content, "utf8");
  }

  private async xlsx(
    overview: Awaited<ReturnType<ReportingService["overview"]>>,
    overdue: Awaited<ReturnType<ReportingService["overdueUpdates"]>>["items"],
  ) {
    const workbook = new ExcelJS.Workbook();
    const generatedAt = new Date();
    const brand = "FF8F2858";
    const brandDark = "FF651A3D";
    const brandLight = "FFF7E8EF";
    const ink = "FF252129";
    const muted = "FF6F6872";
    const line = "FFE4DCE1";
    const soft = "FFF8F5F7";
    const white = "FFFFFFFF";
    const currencyFormat = '#,##0.00 "' + overview.settings.currency + '"';

    workbook.creator = "BID Hub";
    workbook.lastModifiedBy = "BID Hub reporting worker";
    workbook.company = "BID Hub";
    workbook.title = "BID Hub impact and performance report";
    workbook.subject = overview.scope.programmeName + " performance report";
    workbook.description =
      "Programme performance, jobs, funds, learning progress, and overdue reporting follow-up.";
    workbook.keywords =
      "BID Hub, impact, programme, jobs, fundraising, training";
    workbook.category = "Operational reporting";
    workbook.created = generatedAt;
    workbook.modified = generatedAt;
    workbook.calcProperties.fullCalcOnLoad = true;

    const summary = workbook.addWorksheet("Executive summary", {
      views: [{ state: "frozen", ySplit: 7 }],
      pageSetup: {
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        paperSize: 9,
      },
      properties: { defaultRowHeight: 20 },
    });
    summary.mergeCells("A1:D1");
    summary.getCell("A1").value = "BID Hub impact and performance report";
    summary.getCell("A1").font = {
      bold: true,
      size: 20,
      color: { argb: white },
    };
    summary.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: brand },
    };
    summary.getCell("A1").alignment = {
      vertical: "middle",
      horizontal: "left",
    };
    summary.getRow(1).height = 38;
    summary.mergeCells("A2:D2");
    summary.getCell("A2").value =
      "A decision-ready view of programme outcomes and reporting follow-up";
    summary.getCell("A2").font = { italic: true, color: { argb: muted } };
    summary.getRow(2).height = 25;
    summary.addRows([
      ["Programme scope", overview.scope.programmeName],
      [
        "Reporting period",
        this.shortDate(overview.period.from) +
          " to " +
          this.shortDate(overview.period.to),
      ],
      ["Generated", this.dateTime(generatedAt)],
      ["Reporting currency", overview.settings.currency],
      ["Metric", "Value", "Metric", "Value"],
      [
        "Jobs created",
        overview.metrics.jobsCreated,
        "Funds mobilised",
        overview.metrics.fundsMobilisedCents / 100,
      ],
      [
        "Jobs for women",
        overview.metrics.jobsWomen,
        "Jobs for men",
        overview.metrics.jobsMen,
      ],
      [
        "Update submission rate",
        overview.metrics.updateSubmissionRate / 100,
        "Training completion rate",
        overview.metrics.trainingCompletionRate / 100,
      ],
      [
        "Updates submitted",
        overview.metrics.submittedEntrepreneurs,
        "Eligible entrepreneurs",
        overview.metrics.totalEntrepreneurs,
      ],
      [
        "Entrepreneurs with funds",
        overview.metrics.entrepreneursWithFunds,
        "Overdue entrepreneurs",
        overview.metrics.overdueEntrepreneurs,
      ],
    ]);
    summary.mergeCells("B3:D3");
    summary.mergeCells("B4:D4");
    summary.mergeCells("B5:D5");
    summary.mergeCells("B6:D6");
    for (let rowNumber = 3; rowNumber <= 6; rowNumber += 1) {
      const row = summary.getRow(rowNumber);
      row.getCell(1).font = { bold: true, color: { argb: muted } };
      row.getCell(2).font = { color: { argb: ink } };
      row.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: soft },
      };
      row.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: soft },
      };
    }
    this.styleHeader(summary.getRow(7), brandDark, white);
    for (let rowNumber = 8; rowNumber <= 12; rowNumber += 1) {
      const row = summary.getRow(rowNumber);
      row.getCell(1).font = { color: { argb: muted } };
      row.getCell(2).font = { bold: true, size: 13, color: { argb: ink } };
      row.getCell(3).font = { color: { argb: muted } };
      row.getCell(4).font = { bold: true, size: 13, color: { argb: ink } };
      if (rowNumber % 2 === 0) {
        for (let column = 1; column <= 4; column += 1) {
          row.getCell(column).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: soft },
          };
        }
      }
    }
    summary.getCell("D8").numFmt = currencyFormat;
    summary.getCell("B10").numFmt = "0%";
    summary.getCell("D10").numFmt = "0%";
    summary.mergeCells("A14:D14");
    summary.getCell("A14").value = "How to read this report";
    this.styleSection(summary.getCell("A14"), brandLight, brandDark);
    const notes = [
      ["Jobs", overview.sources.jobs],
      ["Funds", overview.sources.funds],
      [
        "Follow-up",
        "The overdue count and follow-up sheet show current status at export generation time.",
      ],
    ];
    for (const note of notes) {
      const row = summary.addRow(note);
      summary.mergeCells(row.number, 2, row.number, 4);
      row.getCell(1).font = { bold: true, color: { argb: muted } };
      row.getCell(2).alignment = { wrapText: true, vertical: "top" };
      row.height = 34;
    }
    summary.columns = [
      { width: 27 },
      { width: 22 },
      { width: 27 },
      { width: 22 },
    ];
    summary.headerFooter.oddFooter =
      "&LBID Hub&CExecutive summary&RPage &P of &N";

    const breakdown = workbook.addWorksheet("Programme performance", {
      views: [{ state: "frozen", ySplit: 4 }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      },
    });
    breakdown.mergeCells("A1:C1");
    breakdown.getCell("A1").value = "Programme performance";
    this.styleSheetTitle(breakdown.getCell("A1"), brand, white);
    breakdown.mergeCells("A2:C2");
    breakdown.getCell("A2").value =
      "Jobs and funds recorded for " +
      overview.scope.programmeName +
      " during the selected period.";
    breakdown.getCell("A2").font = { color: { argb: muted } };
    breakdown.addRow([]);
    breakdown.addRow([
      "Programme",
      "Jobs created",
      "Funds mobilised (" + overview.settings.currency + ")",
    ]);
    this.styleHeader(breakdown.getRow(4), brandDark, white);
    const performanceRows = this.programmeRows(overview);
    for (const values of performanceRows) breakdown.addRow(values);
    const totalRow = breakdown.addRow([
      "Total",
      overview.metrics.jobsCreated,
      overview.metrics.fundsMobilisedCents / 100,
    ]);
    totalRow.font = { bold: true, color: { argb: ink } };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: brandLight },
    };
    const performanceEnd = Math.max(4, totalRow.number);
    breakdown.autoFilter = { from: "A4", to: "C" + performanceEnd };
    breakdown.columns = [{ width: 46 }, { width: 18 }, { width: 27 }];
    for (let rowNumber = 5; rowNumber <= totalRow.number; rowNumber += 1) {
      breakdown.getRow(rowNumber).getCell(3).numFmt = currencyFormat;
    }
    this.styleBody(breakdown, 5, totalRow.number, 3, line, soft);
    breakdown.headerFooter.oddFooter =
      "&LBID Hub&CProgramme performance&RPage &P of &N";

    const followUp = workbook.addWorksheet("Overdue follow-up", {
      views: [{ state: "frozen", ySplit: 4, xSplit: 2 }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      },
    });
    followUp.mergeCells("A1:K1");
    followUp.getCell("A1").value = "Overdue periodic update follow-up";
    this.styleSheetTitle(followUp.getCell("A1"), brand, white);
    followUp.mergeCells("A2:K2");
    followUp.getCell("A2").value =
      "Current follow-up status generated " +
      this.dateTime(generatedAt) +
      ". This list is not constrained by the selected reporting period.";
    followUp.getCell("A2").font = { color: { argb: muted } };
    followUp.getCell("A2").alignment = { wrapText: true };
    followUp.addRow([]);
    followUp.addRow([
      "Business",
      "Representative",
      "Email",
      "Programme access",
      "Period start",
      "Period end",
      "Last submitted",
      "Joined BID Hub",
      "Days without report",
      "Days overdue",
      "Priority",
    ]);
    this.styleHeader(followUp.getRow(4), brandDark, white);
    for (const item of overdue) {
      const row = followUp.addRow([
        item.businessName,
        item.representativeName,
        { text: item.email, hyperlink: "mailto:" + item.email },
        item.programmes.map((programme) => programme.name).join("; ") ||
          "No assigned programme",
        item.lastReport ? new Date(item.lastReport.periodStart) : null,
        item.lastReport ? new Date(item.lastReport.periodEnd) : null,
        item.lastReport ? new Date(item.lastReport.submittedAt) : null,
        new Date(item.joinedAt),
        item.daysWithoutReport,
        item.daysOverdue,
        this.priorityLabel(item.priority),
      ]);
      for (let column = 5; column <= 8; column += 1)
        row.getCell(column).numFmt = "dd mmm yyyy";
      row.getCell(3).font = { color: { argb: "FF1667A8" }, underline: true };
      const priorityCell = row.getCell(11);
      const priorityColor =
        item.priority === "critical"
          ? "FFFDE7E7"
          : item.priority === "late"
            ? "FFFFF2D9"
            : "FFEAF3FF";
      const priorityInk =
        item.priority === "critical"
          ? "FFB42318"
          : item.priority === "late"
            ? "FF9A6700"
            : "FF175CD3";
      priorityCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: priorityColor },
      };
      priorityCell.font = { bold: true, color: { argb: priorityInk } };
    }
    const followUpEnd = Math.max(4, followUp.rowCount);
    followUp.autoFilter = { from: "A4", to: "K" + followUpEnd };
    followUp.columns = [
      { width: 28 },
      { width: 24 },
      { width: 31 },
      { width: 38 },
      { width: 16 },
      { width: 16 },
      { width: 20 },
      { width: 18 },
      { width: 20 },
      { width: 15 },
      { width: 19 },
    ];
    this.styleBody(followUp, 5, followUp.rowCount, 11, line, soft);
    followUp.headerFooter.oddFooter =
      "&LBID Hub&COverdue follow-up&RPage &P of &N";

    const methodology = workbook.addWorksheet("Methodology", {
      pageSetup: {
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        paperSize: 9,
      },
    });
    methodology.mergeCells("A1:C1");
    methodology.getCell("A1").value = "Report methodology and data notes";
    this.styleSheetTitle(methodology.getCell("A1"), brand, white);
    methodology.mergeCells("A2:C2");
    methodology.getCell("A2").value =
      "Definitions used to interpret this workbook consistently.";
    methodology.getCell("A2").font = { color: { argb: muted } };
    methodology.addRow([]);
    methodology.addRow(["Area", "Definition", "Important note"]);
    this.styleHeader(methodology.getRow(4), brandDark, white);
    const methodologyRows = [
      [
        "Jobs created",
        overview.sources.jobs,
        "Jobs for women and men are reported subsets and may not equal total jobs when source records are incomplete.",
      ],
      [
        "Funds mobilised",
        overview.sources.funds,
        "Only fundraising rounds in the company reporting currency are included.",
      ],
      [
        "Update submission rate",
        "Distinct entrepreneurs with an overlapping periodic update divided by eligible entrepreneurs in scope.",
        overview.metrics.submittedEntrepreneurs +
          " submitted of " +
          overview.metrics.totalEntrepreneurs +
          " eligible.",
      ],
      [
        "Training completion",
        "Average stored programme progress for the selected programme scope.",
        "Learners without a stored progress record do not contribute a progress percentage.",
      ],
      [
        "Overdue follow-up",
        overview.sources.overdue,
        "This is a current operational queue as at " +
          this.dateTime(generatedAt) +
          ", not a historical period metric.",
      ],
      [
        "Programme attribution",
        "Activity with no programme link remains company-wide.",
        "Unattributed activity is never forced into an individual programme result.",
      ],
    ];
    for (const values of methodologyRows) methodology.addRow(values);
    methodology.columns = [{ width: 25 }, { width: 68 }, { width: 58 }];
    this.styleBody(methodology, 5, methodology.rowCount, 3, line, soft);
    methodology.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber >= 5) {
        row.alignment = { vertical: "top", wrapText: true };
        row.height = 52;
      }
    });
    methodology.headerFooter.oddFooter =
      "&LBID Hub&CMethodology&RPage &P of &N";

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private programmeRows(
    overview: Awaited<ReturnType<ReportingService["overview"]>>,
  ): Array<[string, number, number]> {
    const jobs = new Map(
      overview.jobsByProgramme.map((item) => [
        item.programmeId ?? "unattributed",
        item,
      ]),
    );
    const funds = new Map(
      overview.fundsByProgramme.map((item) => [
        item.programmeId ?? "unattributed",
        item,
      ]),
    );
    const ids = new Set([...jobs.keys(), ...funds.keys()]);
    return [...ids]
      .map((id): [string, number, number] => {
        const job = jobs.get(id);
        const fund = funds.get(id);
        return [
          job?.programmeName ?? fund?.programmeName ?? "Unknown programme",
          job?.value ?? 0,
          (fund?.value ?? 0) / 100,
        ];
      })
      .sort(
        (left, right) =>
          right[1] - left[1] ||
          right[2] - left[2] ||
          left[0].localeCompare(right[0]),
      );
  }

  private styleSheetTitle(
    cell: ExcelJS.Cell,
    background: string,
    foreground: string,
  ) {
    cell.font = { bold: true, size: 18, color: { argb: foreground } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: background },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.worksheet.getRow(Number(cell.row)).height = 36;
  }

  private styleSection(
    cell: ExcelJS.Cell,
    background: string,
    foreground: string,
  ) {
    cell.font = { bold: true, size: 12, color: { argb: foreground } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: background },
    };
    cell.alignment = { vertical: "middle" };
    cell.worksheet.getRow(Number(cell.row)).height = 26;
  }

  private styleHeader(
    row: ExcelJS.Row,
    background: string,
    foreground: string,
  ) {
    row.font = { bold: true, color: { argb: foreground } };
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: background },
    };
    row.alignment = { vertical: "middle", wrapText: true };
    row.height = 30;
  }

  private styleBody(
    worksheet: ExcelJS.Worksheet,
    fromRow: number,
    toRow: number,
    lastColumn: number,
    line: string,
    alternate: string,
  ) {
    for (let rowNumber = fromRow; rowNumber <= toRow; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      row.alignment = { vertical: "top", wrapText: true };
      if ((rowNumber - fromRow) % 2 === 1) {
        for (let column = 1; column <= lastColumn; column += 1) {
          if (
            !row.getCell(column).fill ||
            row.getCell(column).fill.type === undefined
          ) {
            row.getCell(column).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: alternate },
            };
          }
        }
      }
      for (let column = 1; column <= lastColumn; column += 1) {
        row.getCell(column).border = {
          bottom: { style: "hair", color: { argb: line } },
        };
      }
    }
  }

  private shortDate(value: string | Date) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  }

  private dateTime(value: string | Date) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(new Date(value));
  }

  private priorityLabel(priority: string) {
    if (priority === "critical") return "Critical - over 90 days late";
    if (priority === "late") return "31-90 days late";
    return "Newly overdue";
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
    const safe = /^[=+\-@]/.test(text) ? String.fromCharCode(39) + text : text;
    return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
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
