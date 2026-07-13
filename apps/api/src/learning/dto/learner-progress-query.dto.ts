import { IsOptional, IsString } from 'class-validator';

export class LearnerProgressQueryDto {
  @IsOptional()
  @IsString()
  entrepreneurUserId?: string;

  @IsOptional()
  @IsString()
  programmeId?: string;
}
