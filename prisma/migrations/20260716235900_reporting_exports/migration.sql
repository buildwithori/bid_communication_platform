CREATE TYPE "ReportExportFormat" AS ENUM ('csv', 'xlsx');
CREATE TYPE "ReportExportStatus" AS ENUM ('queued', 'processing', 'ready', 'failed');

CREATE TABLE "report_exports" (
    "id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "programme_id" TEXT,
    "format" "ReportExportFormat" NOT NULL,
    "status" "ReportExportStatus" NOT NULL DEFAULT 'queued',
    "date_from" TIMESTAMP(3) NOT NULL,
    "date_to" TIMESTAMP(3) NOT NULL,
    "file_asset_id" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_exports_file_asset_id_key"
ON "report_exports"("file_asset_id");

CREATE INDEX "report_exports_requested_by_id_created_at_idx"
ON "report_exports"("requested_by_id", "created_at");

CREATE INDEX "report_exports_status_created_at_idx"
ON "report_exports"("status", "created_at");

CREATE INDEX "report_exports_programme_id_idx"
ON "report_exports"("programme_id");

CREATE INDEX "periodic_updates_entrepreneur_user_id_submitted_at_idx"
ON "periodic_updates"("entrepreneur_user_id", "submitted_at");

CREATE INDEX "periodic_updates_programme_id_period_start_period_end_idx"
ON "periodic_updates"("programme_id", "period_start", "period_end");

ALTER TABLE "report_exports"
ADD CONSTRAINT "report_exports_requested_by_id_fkey"
FOREIGN KEY ("requested_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "report_exports"
ADD CONSTRAINT "report_exports_programme_id_fkey"
FOREIGN KEY ("programme_id") REFERENCES "programmes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "report_exports"
ADD CONSTRAINT "report_exports_file_asset_id_fkey"
FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
