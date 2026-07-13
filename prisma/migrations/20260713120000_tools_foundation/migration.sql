-- CreateEnum
CREATE TYPE "EntrepreneurToolType" AS ENUM ('pdf', 'embedded_tool');

-- CreateEnum
CREATE TYPE "EntrepreneurToolVisibility" AS ENUM ('all_entrepreneurs', 'programmes', 'entrepreneurs');

-- CreateEnum
CREATE TYPE "EntrepreneurToolStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "EntrepreneurToolType" NOT NULL,
    "tool_area_id" TEXT NOT NULL,
    "icon_key" TEXT NOT NULL,
    "visibility" "EntrepreneurToolVisibility" NOT NULL DEFAULT 'all_entrepreneurs',
    "status" "EntrepreneurToolStatus" NOT NULL DEFAULT 'draft',
    "pdf_asset_id" TEXT,
    "embedded_url" TEXT,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_programme_access" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_programme_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_entrepreneur_access" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "granted_by_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_entrepreneur_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_hidden_entrepreneurs" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "hidden_by_id" TEXT NOT NULL,
    "hidden_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "tool_hidden_entrepreneurs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tools_pdf_asset_id_key" ON "tools"("pdf_asset_id");
CREATE INDEX "tools_tool_area_id_idx" ON "tools"("tool_area_id");
CREATE INDEX "tools_visibility_status_idx" ON "tools"("visibility", "status");
CREATE INDEX "tools_created_by_id_idx" ON "tools"("created_by_id");
CREATE INDEX "tools_updated_by_id_idx" ON "tools"("updated_by_id");
CREATE INDEX "tool_programme_access_programme_id_idx" ON "tool_programme_access"("programme_id");
CREATE UNIQUE INDEX "tool_programme_access_tool_id_programme_id_key" ON "tool_programme_access"("tool_id", "programme_id");
CREATE INDEX "tool_entrepreneur_access_entrepreneur_user_id_idx" ON "tool_entrepreneur_access"("entrepreneur_user_id");
CREATE INDEX "tool_entrepreneur_access_granted_by_id_idx" ON "tool_entrepreneur_access"("granted_by_id");
CREATE UNIQUE INDEX "tool_entrepreneur_access_tool_id_entrepreneur_user_id_key" ON "tool_entrepreneur_access"("tool_id", "entrepreneur_user_id");
CREATE INDEX "tool_hidden_entrepreneurs_entrepreneur_user_id_idx" ON "tool_hidden_entrepreneurs"("entrepreneur_user_id");
CREATE INDEX "tool_hidden_entrepreneurs_hidden_by_id_idx" ON "tool_hidden_entrepreneurs"("hidden_by_id");
CREATE UNIQUE INDEX "tool_hidden_entrepreneurs_tool_id_entrepreneur_user_id_key" ON "tool_hidden_entrepreneurs"("tool_id", "entrepreneur_user_id");

-- AddForeignKey
ALTER TABLE "content_tool_links" ADD CONSTRAINT "content_tool_links_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_tool_area_id_fkey" FOREIGN KEY ("tool_area_id") REFERENCES "tool_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_pdf_asset_id_fkey" FOREIGN KEY ("pdf_asset_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_programme_access" ADD CONSTRAINT "tool_programme_access_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_programme_access" ADD CONSTRAINT "tool_programme_access_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_entrepreneur_access" ADD CONSTRAINT "tool_entrepreneur_access_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_entrepreneur_access" ADD CONSTRAINT "tool_entrepreneur_access_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_entrepreneur_access" ADD CONSTRAINT "tool_entrepreneur_access_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tool_hidden_entrepreneurs" ADD CONSTRAINT "tool_hidden_entrepreneurs_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_hidden_entrepreneurs" ADD CONSTRAINT "tool_hidden_entrepreneurs_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_hidden_entrepreneurs" ADD CONSTRAINT "tool_hidden_entrepreneurs_hidden_by_id_fkey" FOREIGN KEY ("hidden_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
