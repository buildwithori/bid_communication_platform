import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BusinessStatus } from '@prisma/client';

export class EntrepreneurProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  businessName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sectorId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  stageId?: string | null;
}

export class InviteEntrepreneurDto extends EntrepreneurProfileDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  programmeIds!: string[];
}

export class UpdateEntrepreneurStatusDto {
  @IsIn(Object.values(BusinessStatus))
  status!: BusinessStatus;
}

export class ProgrammeAccessDto {
  @IsString()
  @MaxLength(64)
  programmeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class AcceptEntrepreneurInvitationDto {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
