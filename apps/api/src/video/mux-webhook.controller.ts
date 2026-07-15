import {
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { VideoService } from "./video.service";

@ApiTags("webhooks")
@Controller("webhooks/mux")
export class MuxWebhookController {
  constructor(private readonly videoService: VideoService) {}

  @Post()
  @Public()
  receive(
    @Req() request: RawBodyRequest<{ body: unknown }>,
    @Headers("mux-signature") signature: string | undefined,
  ) {
    return this.videoService.processWebhook(
      request.rawBody,
      signature,
      request.body,
    );
  }
}
