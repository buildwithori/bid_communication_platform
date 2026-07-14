import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SessionNoteVisibility } from '@prisma/client';

export class SessionReasonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class RescheduleSessionDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class CompleteSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class AddSessionNoteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  note!: string;

  @IsOptional()
  @IsEnum(SessionNoteVisibility)
  visibility?: SessionNoteVisibility;
}
