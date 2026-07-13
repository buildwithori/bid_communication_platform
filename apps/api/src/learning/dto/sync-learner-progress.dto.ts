import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class LearnerContentProgressInputDto {
  @IsString()
  programmeId!: string;

  @IsString()
  moduleId!: string;

  @IsString()
  contentItemId!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lastPositionSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class SyncLearnerProgressDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearnerContentProgressInputDto)
  items!: LearnerContentProgressInputDto[];
}
