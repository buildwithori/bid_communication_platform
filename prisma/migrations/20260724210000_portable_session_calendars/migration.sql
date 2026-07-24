CREATE TYPE "CalendarProvisioningStatus" AS ENUM ('pending', 'processing', 'ready', 'failed');

ALTER TABLE "sessions"
ADD COLUMN "calendar_uid" TEXT,
ADD COLUMN "calendar_revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "calendar_provisioning_status" "CalendarProvisioningStatus",
ADD COLUMN "calendar_provisioning_error" TEXT,
ADD COLUMN "calendar_provisioning_claimed_at" TIMESTAMP(3),
ADD COLUMN "calendar_provisioned_at" TIMESTAMP(3);

UPDATE "sessions"
SET
  "calendar_uid" = "id" || '@bid-hub',
  "calendar_provisioning_status" = CASE
    WHEN "calendar_event_id" IS NOT NULL THEN 'ready'::"CalendarProvisioningStatus"
    WHEN "status" = 'confirmed' THEN 'pending'::"CalendarProvisioningStatus"
    ELSE NULL
  END,
  "calendar_provisioned_at" = CASE
    WHEN "calendar_event_id" IS NOT NULL THEN COALESCE("calendar_last_synced_at", "updated_at")
    ELSE NULL
  END;

ALTER TABLE "sessions"
ALTER COLUMN "calendar_uid" SET NOT NULL;

CREATE UNIQUE INDEX "sessions_calendar_uid_key" ON "sessions"("calendar_uid");
CREATE INDEX "sessions_calendar_provisioning_status_calendar_provisioning_claimed_at_idx"
ON "sessions"("calendar_provisioning_status", "calendar_provisioning_claimed_at");
