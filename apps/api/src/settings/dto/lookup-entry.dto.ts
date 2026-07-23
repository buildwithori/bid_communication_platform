import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSectorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  key?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateSectorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  key?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateBusinessStageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  key?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  definition!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateBusinessStageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  key?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  definition?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateProgrammeGoalTypeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  requiresTargetAmount?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateProgrammeGoalTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  requiresTargetAmount?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateToolAreaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  key?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateToolAreaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  key?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateSessionTypeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  key?: string;

  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateSessionTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
