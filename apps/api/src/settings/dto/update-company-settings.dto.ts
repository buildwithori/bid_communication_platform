import { Transform } from 'class-transformer';
import {
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
} from 'class-validator';

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
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsISO4217CurrencyCode()
  defaultCurrency?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsTimeZone()
  @MaxLength(80)
  defaultTimezone?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsIn(['google_meet'])
  defaultSessionProvider?: string;

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
