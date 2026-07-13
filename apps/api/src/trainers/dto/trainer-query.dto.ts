import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TrainerAccessLevel, TrainerCapabilityStatus } from '@prisma/client';

export class TrainerQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  sectorId?: string;

  @IsOptional()
  @IsIn(Object.values(TrainerAccessLevel))
  accessLevel?: TrainerAccessLevel;

  @IsOptional()
  @IsIn(Object.values(TrainerCapabilityStatus))
  status?: TrainerCapabilityStatus;

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
