import { IsString } from 'class-validator';

export class ContentRatingContextDto {
  @IsString()
  programmeId!: string;

  @IsString()
  moduleId!: string;
}
