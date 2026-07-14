import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ToolRequestStatus } from '@prisma/client';

export class CreateToolRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  businessNeed!: string;

  @IsString()
  toolAreaId!: string;

  @IsOptional()
  @IsDateString()
  neededBy?: string;
}

export class UpdateToolRequestDto {
  @IsOptional()
  @IsIn(Object.values(ToolRequestStatus))
  status?: ToolRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  adminDecisionNote?: string | null;

  @IsOptional()
  @IsString()
  linkedToolId?: string | null;
}
