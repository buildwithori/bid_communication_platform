import { Transform } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO4217CurrencyCode,
  IsOptional,
  IsString,
  IsTimeZone,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  periodicUpdateOverdueAfterDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  moduleCompletionDeliverableDueDays?: number;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsISO4217CurrencyCode()
  defaultCurrency?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsTimeZone()
  @MaxLength(80)
  defaultTimezone?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsIn(["google_meet"])
  defaultSessionProvider?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  sessionWorkingDays?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  sessionWorkdayStartMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  sessionWorkdayEndMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  sessionSlotIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  defaultSessionDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  inAppNotificationsEnabledByDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabledByDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  reminderNotificationsEnabledByDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyDigestEnabledByDefault?: boolean;
}
