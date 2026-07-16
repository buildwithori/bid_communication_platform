import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitDeliverableDto {
  @IsString()
  fileAssetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
