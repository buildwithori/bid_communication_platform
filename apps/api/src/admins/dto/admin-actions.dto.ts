import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsTimeZone,
  MaxLength,
  MinLength,
} from "class-validator";

export class InviteAdminDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}

export class AcceptAdminInvitationDto {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}

export class UpdateAdminProfileDto {
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

  @IsTimeZone()
  timezone!: string;
}

export class UpdateAdminStatusDto {
  @IsIn(["active", "inactive"])
  status!: "active" | "inactive";
}
