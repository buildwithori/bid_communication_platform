import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CursorPaginationDto } from '../../common/pagination/cursor-pagination.dto';

export class ProgrammeDeliverableRuleQueryDto extends CursorPaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
