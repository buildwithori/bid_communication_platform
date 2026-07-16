import { ReportExportFormat } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { CursorPaginationDto } from "../../common/pagination/cursor-pagination.dto";

export const REPORT_PRIORITY_VALUES = [
  "newly_overdue",
  "late",
  "critical",
] as const;

export type ReportPriority = (typeof REPORT_PRIORITY_VALUES)[number];

export class ReportingOverviewQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  programmeId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class OverdueUpdatesQueryDto extends CursorPaginationDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  programmeId?: string;

  @IsOptional()
  @IsIn(REPORT_PRIORITY_VALUES)
  priority?: ReportPriority;
}

export class CreateReportExportDto extends ReportingOverviewQueryDto {
  @IsIn(Object.values(ReportExportFormat))
  format!: ReportExportFormat;
}

export class SendReportingReminderDto {
  @IsString()
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsIn(["email", "in_app"])
  channel!: "email" | "in_app";
}
