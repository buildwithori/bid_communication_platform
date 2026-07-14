import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CreateDirectUploadDto } from './dto/create-direct-upload.dto';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
@UseGuards(SessionAuthGuard, RolesGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('direct-upload-url')
  createDirectUpload(@CurrentUser() user: User, @Body() dto: CreateDirectUploadDto) {
    return this.filesService.createDirectUpload(user, dto);
  }

  @Get(':id/signed-url')
  getSignedReadUrl(@CurrentUser() user: User, @Param('id') id: string) {
    return this.filesService.getSignedReadUrl(user, id);
  }
}
