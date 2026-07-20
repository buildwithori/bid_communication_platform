import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean | null;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean | null;
}
