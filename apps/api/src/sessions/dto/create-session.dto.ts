import { IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SessionType } from '@prisma/client';

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  entrepreneurUserId?: string;

  @IsOptional()
  @IsString()
  programmeId?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsEnum(SessionType)
  type!: SessionType;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsIn(['google_meet'])
  meetingProvider?: string;
}
