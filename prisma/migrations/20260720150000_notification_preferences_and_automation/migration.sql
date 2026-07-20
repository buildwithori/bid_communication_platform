ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'session_reminder';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'deliverable_due_reminder';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'weekly_digest';

ALTER TABLE "notification_preferences"
  ALTER COLUMN "in_app_enabled" DROP DEFAULT,
  ALTER COLUMN "in_app_enabled" DROP NOT NULL,
  ALTER COLUMN "email_enabled" DROP DEFAULT,
  ALTER COLUMN "email_enabled" DROP NOT NULL;

ALTER TABLE "notifications" ADD COLUMN "dedupe_key" TEXT;
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

CREATE TABLE "notification_automation_preferences" (
  "user_id" TEXT NOT NULL,
  "reminder_enabled" BOOLEAN,
  "weekly_digest_enabled" BOOLEAN,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_automation_preferences_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "notification_automation_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "deliverable_instances_status_due_date_idx"
  ON "deliverable_instances"("status", "due_date");
