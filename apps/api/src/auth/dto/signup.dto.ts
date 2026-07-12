import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  businessName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  representativeName!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  country!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @IsString()
  sectorId?: string;

  @IsOptional()
  @IsString()
  stageId?: string;
}
