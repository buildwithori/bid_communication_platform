import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { EntrepreneurQueryDto } from './dto/entrepreneur-query.dto';
import { EntrepreneursService } from './entrepreneurs.service';

@ApiTags('entrepreneurs')
@Controller('entrepreneurs')
@UseGuards(SessionAuthGuard, RolesGuard)
export class EntrepreneursController {
  constructor(private readonly entrepreneursService: EntrepreneursService) {}

  @Get()
  listEntrepreneurs(@CurrentUser() user: User, @Query() query: EntrepreneurQueryDto) {
    return this.entrepreneursService.listEntrepreneurs(user, query);
  }

  @Get(':entrepreneurUserId')
  getEntrepreneur(@CurrentUser() user: User, @Param('entrepreneurUserId') entrepreneurUserId: string) {
    return this.entrepreneursService.getEntrepreneur(user, entrepreneurUserId);
  }
}
