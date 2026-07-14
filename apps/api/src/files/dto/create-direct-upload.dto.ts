import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsMimeType, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export const fileUploadUsageValues = [
  'deliverable_submission',
  'content_pdf',
  'tool_pdf',
  'report_export',
] as const;

export type FileUploadUsage = (typeof fileUploadUsageValues)[number];

export class CreateDirectUploadDto {
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  originalFilename!: string;

  @IsMimeType()
  @MaxLength(120)
  mimeType!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(25 * 1024 * 1024)
  sizeBytes!: number;

  @IsIn(fileUploadUsageValues)
  usage!: FileUploadUsage;

  @IsOptional()
  @IsString()
  contentItemId?: string;
}
