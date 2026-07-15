import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const adminDirectoryStatuses = [
  "active",
  "invited",
  "disabled",
] as const;
export type AdminDirectoryStatus = (typeof adminDirectoryStatuses)[number];

export const adminCalendarStatuses = ["connected", "not_connected"] as const;
export type AdminCalendarStatus = (typeof adminCalendarStatuses)[number];

export class AdminQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(adminDirectoryStatuses)
  status?: AdminDirectoryStatus;

  @IsOptional()
  @IsIn(adminCalendarStatuses)
  calendarStatus?: AdminCalendarStatus;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
