-- CreateEnum
CREATE TYPE "FileAssetUsage" AS ENUM ('deliverable_submission', 'content_pdf', 'tool_pdf', 'report_export');

-- AlterTable
ALTER TABLE "file_assets"
ADD COLUMN "usage" "FileAssetUsage",
ADD COLUMN "uploaded_by_id" TEXT,
ADD COLUMN "verified_at" TIMESTAMP(3),
ADD COLUMN "failure_reason" TEXT;

-- CreateIndex
CREATE INDEX "file_assets_uploaded_by_id_status_idx" ON "file_assets"("uploaded_by_id", "status");

-- AddForeignKey
ALTER TABLE "file_assets"
ADD CONSTRAINT "file_assets_uploaded_by_id_fkey"
FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
