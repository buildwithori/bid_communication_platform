import { IsOptional, IsString } from 'class-validator';

export class LearnerProgressQueryDto {
  @IsOptional()
  @IsString()
  entrepreneurUserId?: string;

  @IsString()
  programmeId!: string;

  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsOptional()
  @IsString()
  contentItemId?: string;
}
