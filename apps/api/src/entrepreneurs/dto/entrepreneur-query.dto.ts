import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { BusinessSource, BusinessStatus } from '@prisma/client';

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
  @IsIn(Object.values(BusinessStatus))
  status?: BusinessStatus;

  @IsOptional()
  @IsIn(Object.values(BusinessSource))
  source?: BusinessSource;

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
