import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ProgrammeModuleQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(["video", "pdf", "tool"])
  contentType?: "video" | "pdf" | "tool";

  @IsOptional()
  @IsIn(["not_started", "in_progress", "completed"])
  progressStatus?: "not_started" | "in_progress" | "completed";

  @IsOptional()
  @IsString()
  @MaxLength(64)
  excludeContentItemId?: string;

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

export class CreateProgrammeModuleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isReusable?: boolean;
}

export class UpdateProgrammeModuleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isReusable?: boolean;
}

export class ReuseProgrammeModuleDto {
  @IsString()
  moduleId!: string;
}

export class MoveProgrammeModuleDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  position!: number;
}
