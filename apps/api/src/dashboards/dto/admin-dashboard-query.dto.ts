import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { BusinessSource } from "@prisma/client";

export class AdminDashboardRecentQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(Object.values(BusinessSource))
  source?: BusinessSource;

  @IsOptional()
  @IsIn(["active", "without_programme"])
  status?: "active" | "without_programme";

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(25)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
