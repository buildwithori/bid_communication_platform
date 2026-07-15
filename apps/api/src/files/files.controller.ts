import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateDirectUploadDto } from './dto/create-direct-upload.dto';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
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

  @Post(':id/complete')
  completeUpload(@CurrentUser() user: User, @Param('id') id: string) {
    return this.filesService.completeDirectUpload(user, id);
  }
}
