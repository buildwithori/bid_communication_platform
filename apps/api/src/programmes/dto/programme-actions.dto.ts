import { Transform } from "class-transformer";
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
import { ProgrammeAccessType } from "@prisma/client";

export const programmePublishStates = ["draft", "published"] as const;
export type ProgrammePublishState = (typeof programmePublishStates)[number];

export class CreateProgrammeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @IsIn(Object.values(ProgrammeAccessType))
  accessType!: ProgrammeAccessType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxEntrepreneurs!: number;

  @IsIn(programmePublishStates)
  publishState!: ProgrammePublishState;
}

export class UpdateProgrammeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @IsOptional()
  @IsIn(Object.values(ProgrammeAccessType))
  accessType?: ProgrammeAccessType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxEntrepreneurs?: number;
}

export class ArchiveProgrammeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
