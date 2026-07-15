ALTER TABLE "video_assets"
  ALTER COLUMN "content_item_id" DROP NOT NULL,
  ADD COLUMN "uploaded_by_id" TEXT,
  ADD COLUMN "ready_at" TIMESTAMP(3),
  ADD COLUMN "failure_reason" TEXT;

CREATE INDEX "video_assets_uploaded_by_id_status_idx"
  ON "video_assets"("uploaded_by_id", "status");

ALTER TABLE "video_assets"
  ADD CONSTRAINT "video_assets_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "video_webhook_events" (
  "id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "video_asset_id" TEXT,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  CONSTRAINT "video_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "video_webhook_events_event_type_received_at_idx"
  ON "video_webhook_events"("event_type", "received_at");

CREATE INDEX "video_webhook_events_video_asset_id_idx"
  ON "video_webhook_events"("video_asset_id");

ALTER TABLE "video_webhook_events"
  ADD CONSTRAINT "video_webhook_events_video_asset_id_fkey"
  FOREIGN KEY ("video_asset_id") REFERENCES "video_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
