import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
  @IsString()
  @MaxLength(3)
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  defaultTimezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
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
