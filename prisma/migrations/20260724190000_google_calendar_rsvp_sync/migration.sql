CREATE TYPE "CalendarAttendeeResponseStatus" AS ENUM (
  'needs_action',
  'accepted',
  'tentative',
  'declined'
);

ALTER TABLE "calendar_connections"
  ADD COLUMN "watch_channel_id" TEXT,
  ADD COLUMN "watch_resource_id" TEXT,
  ADD COLUMN "watch_token_hash" TEXT,
  ADD COLUMN "watch_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "calendar_connections_watch_channel_id_key"
  ON "calendar_connections"("watch_channel_id");

ALTER TABLE "sessions"
  ADD COLUMN "calendar_response_status" "CalendarAttendeeResponseStatus",
  ADD COLUMN "calendar_response_updated_at" TIMESTAMP(3),
  ADD COLUMN "calendar_last_synced_at" TIMESTAMP(3),
  ADD COLUMN "calendar_event_etag" TEXT;

UPDATE "sessions"
SET
  "calendar_response_status" = 'needs_action',
  "calendar_response_updated_at" = COALESCE("updated_at", CURRENT_TIMESTAMP)
WHERE "calendar_event_id" IS NOT NULL
  AND "status" = 'confirmed';

CREATE INDEX "sessions_owner_user_id_status_calendar_event_id_idx"
  ON "sessions"("owner_user_id", "status", "calendar_event_id");
