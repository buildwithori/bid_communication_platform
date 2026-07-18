import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertProgrammeGoalDto {
  @IsOptional()
  @IsString()
  programmeId?: string | null;

  @IsString()
  goalTypeId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  targetAmountCents?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  milestoneAchieved?: boolean;
}

export class UpsertFundraisingRoundDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsInt()
  @Min(0)
  amountCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  programmeId?: string | null;

  @IsOptional()
  @IsString()
  programmeGoalId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  source?: string | null;

  @IsDateString()
  date!: string;
}

export class UpsertPeriodicUpdateDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  programmeId?: string | null;

  @IsInt()
  @Min(0)
  jobsCreated!: number;

  @IsInt()
  @Min(0)
  jobsWomen!: number;

  @IsInt()
  @Min(0)
  jobsMen!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  notes?: string | null;
}
