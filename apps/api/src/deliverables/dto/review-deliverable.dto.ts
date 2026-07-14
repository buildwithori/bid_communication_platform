import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { DeliverableReviewDecision } from '@prisma/client';

export class ReviewDeliverableDto {
  @IsIn(Object.values(DeliverableReviewDecision))
  decision!: DeliverableReviewDecision;

  @ValidateIf((dto: ReviewDeliverableDto) => dto.decision === DeliverableReviewDecision.changes_required)
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  feedback!: string;
}
