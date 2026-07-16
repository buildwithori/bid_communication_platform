-- AlterEnum
ALTER TYPE "NotificationDeliveryStatus" ADD VALUE 'processing';

-- AlterTable
ALTER TABLE "notification_deliveries"
ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "next_attempt_at" TIMESTAMP(3);

-- ReplaceIndex
DROP INDEX "notification_deliveries_channel_status_idx";
CREATE INDEX "notification_deliveries_channel_status_next_attempt_at_idx"
ON "notification_deliveries"("channel", "status", "next_attempt_at");
