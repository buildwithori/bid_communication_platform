import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ReportClientErrorDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(1_000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  digest?: string;

  @IsString()
  @MaxLength(500)
  path!: string;

  @IsIn(["route", "global"])
  boundary!: "route" | "global";
}
