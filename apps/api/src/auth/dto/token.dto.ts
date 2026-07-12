import { IsString, MaxLength, MinLength } from 'class-validator';

export class TokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(240)
  token!: string;
}
