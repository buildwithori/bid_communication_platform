import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User, UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { VideoService } from "./video.service";

@ApiTags("video")
@Controller("videos")
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post("direct-uploads")
  @Roles(UserRole.admin)
  createDirectUpload(@CurrentUser() user: User) {
    return this.videoService.createDirectUpload(user);
  }

  @Get(":id")
  @Roles(UserRole.admin)
  getAsset(@CurrentUser() user: User, @Param("id") id: string) {
    return this.videoService.getAsset(user, id);
  }

  @Delete(":id/direct-upload")
  @Roles(UserRole.admin)
  cancelDirectUpload(@CurrentUser() user: User, @Param("id") id: string) {
    return this.videoService.cancelDirectUpload(user, id);
  }

  @Get(":id/playback")
  getPlayback(@CurrentUser() user: User, @Param("id") id: string) {
    return this.videoService.getSignedPlayback(user, id);
  }
}
