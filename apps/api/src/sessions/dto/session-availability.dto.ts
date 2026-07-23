import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class SessionAvailabilityQueryDto {
  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;

  @IsString()
  timezone!: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  sessionType!: string;
}

export class SessionTeamMemberQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsIn(["admin", "trainer"])
  role?: "admin" | "trainer";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
