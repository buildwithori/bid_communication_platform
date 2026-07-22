import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ContentItemStatus, ContentItemType } from '@prisma/client';

export class ContentItemQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(Object.values(ContentItemType))
  type?: ContentItemType;

  @IsOptional()
  @IsIn(Object.values(ContentItemStatus))
  status?: ContentItemStatus;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  programmeId?: string;

  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsOptional()
  @IsString()
  excludeModuleId?: string;

  @IsOptional()
  @IsString()
  reusableForModuleId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export class UpdateContentItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;
}

export class AttachContentItemDto {
  @IsString()
  contentItemId!: string;
}

export class MoveModuleContentItemDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  position!: number;
}
