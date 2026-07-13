import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { EntrepreneurToolStatus, EntrepreneurToolType, EntrepreneurToolVisibility } from '@prisma/client';

export class ToolQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(Object.values(EntrepreneurToolType))
  type?: EntrepreneurToolType;

  @IsOptional()
  @IsIn(Object.values(EntrepreneurToolVisibility))
  visibility?: EntrepreneurToolVisibility;

  @IsOptional()
  @IsIn(Object.values(EntrepreneurToolStatus))
  status?: EntrepreneurToolStatus;

  @IsOptional()
  @IsString()
  toolAreaId?: string;

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
