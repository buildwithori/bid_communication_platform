import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  TrainerAccessLevel,
  TrainerCapabilityStatus,
  TrainerRoleLabel,
} from '@prisma/client';

export class TrainerCapabilityDto {
  @IsIn(Object.values(TrainerRoleLabel))
  roleLabel!: TrainerRoleLabel;

  @IsIn(Object.values(TrainerAccessLevel))
  accessLevel!: TrainerAccessLevel;

  @ValidateIf(
    (value: TrainerCapabilityDto) =>
      value.accessLevel === TrainerAccessLevel.guest,
  )
  @IsDateString()
  accessExpiresOn?: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  sectorIds!: string[];
}

export class InviteTrainerDto extends TrainerCapabilityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class UpdateTrainerDto extends TrainerCapabilityDto {
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
}

export class UpdateTrainerProfileDto {
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
}

export class UpdateTrainerStatusDto {
  @IsIn(Object.values(TrainerCapabilityStatus))
  status!: TrainerCapabilityStatus;
}

export class AcceptTrainerInvitationDto {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
