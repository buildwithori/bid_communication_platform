import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { ContentItemType } from '@prisma/client';

export class CreateContentItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsIn(Object.values(ContentItemType))
  type!: ContentItemType;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(24 * 60 * 60)
  durationSeconds?: number;

  @ValidateIf((dto: CreateContentItemDto) => dto.type === ContentItemType.pdf)
  @IsString()
  fileAssetId?: string;

  @ValidateIf((dto: CreateContentItemDto) => dto.type === ContentItemType.video)
  @IsString()
  videoAssetId?: string;

  @ValidateIf((dto: CreateContentItemDto) => dto.type === ContentItemType.tool && !dto.externalUrl)
  @IsString()
  toolId?: string;

  @ValidateIf((dto: CreateContentItemDto) => dto.type === ContentItemType.tool && !dto.toolId)
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  externalUrl?: string;
}
