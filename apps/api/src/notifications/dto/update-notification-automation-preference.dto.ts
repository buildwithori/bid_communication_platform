import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationAutomationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean | null;

  @IsOptional()
  @IsBoolean()
  weeklyDigestEnabled?: boolean | null;
}
