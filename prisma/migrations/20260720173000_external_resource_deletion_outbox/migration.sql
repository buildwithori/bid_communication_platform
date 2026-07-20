CREATE TYPE "ExternalResourceProvider" AS ENUM ('mux_asset', 'mux_upload', 'object_storage', 'google_calendar_event');

CREATE TYPE "ExternalResourceDeletionStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE "external_resource_deletions" (
  "id" TEXT NOT NULL,
  "provider" "ExternalResourceProvider" NOT NULL,
  "external_id" TEXT NOT NULL,
  "owner_user_id" TEXT,
  "status" "ExternalResourceDeletionStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "next_attempt_at" TIMESTAMP(3),
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "external_resource_deletions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_resource_deletions_provider_external_id_key" ON "external_resource_deletions"("provider", "external_id");
CREATE INDEX "external_resource_deletions_status_next_attempt_at_created_at_idx" ON "external_resource_deletions"("status", "next_attempt_at", "created_at");
