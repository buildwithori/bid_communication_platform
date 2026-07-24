import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { SessionNoteVisibility } from "@prisma/client";

export class SessionReasonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class RescheduleSessionDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class CompleteSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class AddSessionNoteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  note!: string;

  @IsOptional()
  @IsEnum(SessionNoteVisibility)
  visibility?: SessionNoteVisibility;
}

export class SendSessionMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;

  @IsIn(["email", "in_app"])
  channel!: "email" | "in_app";

  @IsIn(["standard", "needs-response", "urgent"])
  priority!: "standard" | "needs-response" | "urgent";
}
