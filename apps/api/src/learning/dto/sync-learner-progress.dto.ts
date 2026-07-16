import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const progressStatuses = ['not_started', 'in_progress', 'completed'] as const;
const clientProgressSources = ['player', 'explicit_action'] as const;

export class LearnerContentProgressInputDto {
  @IsString()
  programmeId!: string;

  @IsString()
  moduleId!: string;

  @IsString()
  contentItemId!: string;

  @IsIn(progressStatuses)
  status!: (typeof progressStatuses)[number];

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

  @IsDateString()
  clientEventAt!: string;

  @IsIn(clientProgressSources)
  source!: (typeof clientProgressSources)[number];
}

export class SyncLearnerProgressDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LearnerContentProgressInputDto)
  items!: LearnerContentProgressInputDto[];
}
