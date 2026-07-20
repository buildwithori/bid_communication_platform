import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateDirectUploadDto } from "./dto/create-direct-upload.dto";
import { FilesService } from "./files.service";
import { WorkbookPreviewQueryDto } from "./dto/workbook-preview-query.dto";

@ApiTags("files")
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("direct-upload-url")
  createDirectUpload(
    @CurrentUser() user: User,
    @Body() dto: CreateDirectUploadDto,
  ) {
    return this.filesService.createDirectUpload(user, dto);
  }

  @Get(":id/workbook-preview")
  getWorkbookPreview(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Query() query: WorkbookPreviewQueryDto,
  ) {
    return this.filesService.getWorkbookPreview(user, id, query);
  }

  @Get(":id/signed-url")
  getSignedReadUrl(@CurrentUser() user: User, @Param("id") id: string) {
    return this.filesService.getSignedReadUrl(user, id);
  }

  @Post(":id/complete")
  completeUpload(@CurrentUser() user: User, @Param("id") id: string) {
    return this.filesService.completeDirectUpload(user, id);
  }
}
