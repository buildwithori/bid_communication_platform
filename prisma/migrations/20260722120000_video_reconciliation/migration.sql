ALTER TABLE "video_assets"
  ADD COLUMN "last_reconciled_at" TIMESTAMP(3),
  ADD COLUMN "reconciliation_failures" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "video_assets_status_last_reconciled_at_idx"
  ON "video_assets"("status", "last_reconciled_at");
