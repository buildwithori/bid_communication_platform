import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDeliverableDueDateDto {
  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
