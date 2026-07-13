import { IsArray, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { EntrepreneurToolStatus, EntrepreneurToolType, EntrepreneurToolVisibility } from '@prisma/client';

export class UpsertToolDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(700)
  description?: string;

  @IsOptional()
  @IsIn(Object.values(EntrepreneurToolType))
  type?: EntrepreneurToolType;

  @IsOptional()
  @IsString()
  toolAreaId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  iconKey?: string;

  @IsOptional()
  @IsIn(Object.values(EntrepreneurToolVisibility))
  visibility?: EntrepreneurToolVisibility;

  @IsOptional()
  @IsIn(Object.values(EntrepreneurToolStatus))
  status?: EntrepreneurToolStatus;

  @IsOptional()
  @IsString()
  pdfAssetId?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  embeddedUrl?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  programmeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entrepreneurUserIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hiddenEntrepreneurUserIds?: string[];
}

export class CreateToolDto extends UpsertToolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  declare name: string;

  @IsString()
  @MinLength(10)
  @MaxLength(700)
  declare description: string;

  @IsIn(Object.values(EntrepreneurToolType))
  declare type: EntrepreneurToolType;

  @IsString()
  declare toolAreaId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  declare iconKey: string;

  @IsIn(Object.values(EntrepreneurToolVisibility))
  declare visibility: EntrepreneurToolVisibility;

  @IsIn(Object.values(EntrepreneurToolStatus))
  declare status: EntrepreneurToolStatus;
}
