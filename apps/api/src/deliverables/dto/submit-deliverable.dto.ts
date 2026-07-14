import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class SubmitDeliverableDto {
  @IsOptional()
  @IsString()
  fileAssetId?: string;

  @ValidateIf((dto: SubmitDeliverableDto) => !dto.fileAssetId)
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  originalFilename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(25 * 1024 * 1024)
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
