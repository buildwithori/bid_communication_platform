import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { DeliverableDueType, DeliverableRecurringCadence, DeliverableRequiredScope } from '@prisma/client';

export class UpsertProgrammeDeliverableRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @IsIn(Object.values(DeliverableDueType))
  dueType?: DeliverableDueType;

  @ValidateIf((dto) => dto.dueType === DeliverableDueType.fixed_date || dto.dueDate !== undefined)
  @IsDateString()
  dueDate?: string;

  @ValidateIf((dto) => dto.dueType === DeliverableDueType.module_completion || dto.dueAfterModuleId !== undefined)
  @IsString()
  dueAfterModuleId?: string;

  @ValidateIf((dto) => dto.dueType === DeliverableDueType.recurring || dto.recurringCadence !== undefined)
  @IsIn(Object.values(DeliverableRecurringCadence))
  recurringCadence?: DeliverableRecurringCadence;

  @IsOptional()
  @IsIn(Object.values(DeliverableRequiredScope))
  requiredForScope?: DeliverableRequiredScope;

  @ValidateIf((dto) => dto.requiredForScope === DeliverableRequiredScope.stage || dto.requiredStageId !== undefined)
  @IsString()
  requiredStageId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateProgrammeDeliverableRuleDto extends UpsertProgrammeDeliverableRuleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  declare name: string;

  @IsIn(Object.values(DeliverableDueType))
  declare dueType: DeliverableDueType;
}
