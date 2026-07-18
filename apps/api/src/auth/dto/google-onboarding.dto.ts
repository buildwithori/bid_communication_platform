import { IsEmail, IsNotEmpty, IsOptional, IsString, IsTimeZone, MaxLength } from 'class-validator';

export class GoogleOnboardingDto {
  @IsString() @IsNotEmpty() @MaxLength(160)
  businessName!: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  representativeName!: string;

  @IsEmail() @MaxLength(180)
  email!: string;

  @IsString() @IsNotEmpty() @MaxLength(80)
  country!: string;

  @IsString() @IsNotEmpty() @MaxLength(40)
  phone!: string;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}
