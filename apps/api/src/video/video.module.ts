import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { LearningModule } from "../learning/learning.module";
import { MuxClient } from "./mux.client";
import { MuxWebhookController } from "./mux-webhook.controller";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";

@Module({
  imports: [AuditModule, LearningModule],
  controllers: [VideoController, MuxWebhookController],
  providers: [MuxClient, VideoService],
  exports: [VideoService, MuxClient],
})
export class VideoModule {}
