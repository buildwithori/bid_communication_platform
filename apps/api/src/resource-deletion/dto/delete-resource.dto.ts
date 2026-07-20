import { IsString, MaxLength, MinLength } from "class-validator";

export class DeleteResourceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  confirmation!: string;
}
