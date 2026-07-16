import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LearnerProgressStatus, ProgrammeAccessType } from '@prisma/client';

const lifecycleValues = ['draft', 'scheduled', 'active', 'completed', 'archived'] as const;

export type ProgrammeLifecycle = (typeof lifecycleValues)[number];

export class ProgrammeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(Object.values(ProgrammeAccessType))
  accessType?: ProgrammeAccessType;

  @IsOptional()
  @IsIn(lifecycleValues)
  lifecycle?: ProgrammeLifecycle;

  @IsOptional()
  @IsIn(Object.values(LearnerProgressStatus))
  progressStatus?: LearnerProgressStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeArchived?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  grantableOnly?: boolean;

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
