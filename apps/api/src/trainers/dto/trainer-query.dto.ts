import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TrainerAccessLevel } from '@prisma/client';

export const trainerDirectoryStatuses = [
  'active',
  'invited',
  'inactive',
] as const;
export type TrainerDirectoryStatus =
  (typeof trainerDirectoryStatuses)[number];

export const trainerCalendarStatuses = [
  'connected',
  'not_connected',
] as const;
export type TrainerCalendarStatus =
  (typeof trainerCalendarStatuses)[number];

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
  @IsIn(trainerDirectoryStatuses)
  status?: TrainerDirectoryStatus;

  @IsOptional()
  @IsIn(trainerCalendarStatuses)
  calendarStatus?: TrainerCalendarStatus;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
