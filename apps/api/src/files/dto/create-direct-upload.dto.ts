import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsMimeType, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { FileAssetUsage } from '@prisma/client';

export const fileUploadUsageValues = Object.values(FileAssetUsage);
export type FileUploadUsage = FileAssetUsage;

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
  usage!: FileAssetUsage;

  @IsOptional()
  @IsString()
  contentItemId?: string;
}
