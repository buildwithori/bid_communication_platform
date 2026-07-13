import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { ProgrammeQueryDto } from './dto/programme-query.dto';
import { ProgrammesService } from './programmes.service';

@ApiTags('programmes')
@Controller('programmes')
@UseGuards(SessionAuthGuard, RolesGuard)
export class ProgrammesController {
  constructor(private readonly programmesService: ProgrammesService) {}

  @Get()
  listProgrammes(@CurrentUser() user: User, @Query() query: ProgrammeQueryDto) {
    return this.programmesService.listProgrammes(user, query);
  }

  @Get(':id')
  getProgramme(@CurrentUser() user: User, @Param('id') id: string) {
    return this.programmesService.getProgramme(user, id);
  }
}
