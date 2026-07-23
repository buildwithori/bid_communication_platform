import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { BusinessSource, BusinessStatus } from '@prisma/client';

export const entrepreneurDirectoryStatuses = [
  ...Object.values(BusinessStatus),
  'invited',
] as const;
export type EntrepreneurDirectoryStatus =
  (typeof entrepreneurDirectoryStatuses)[number];

export const entrepreneurProgrammeAccessFilters = [
  'with_programme',
  'without_programme',
] as const;
export type EntrepreneurProgrammeAccessFilter =
  (typeof entrepreneurProgrammeAccessFilters)[number];

export class EntrepreneurQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  sectorId?: string;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @IsString()
  programmeId?: string;

  @IsOptional()
  @IsIn(entrepreneurDirectoryStatuses)
  status?: EntrepreneurDirectoryStatus;

  @IsOptional()
  @IsIn(Object.values(BusinessSource))
  source?: BusinessSource;

  @IsOptional()
  @IsIn(entrepreneurProgrammeAccessFilters)
  programmeAccess?: EntrepreneurProgrammeAccessFilter;

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
