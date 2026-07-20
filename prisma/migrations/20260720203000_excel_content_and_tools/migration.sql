ALTER TYPE "ContentItemType" ADD VALUE IF NOT EXISTS 'excel';
ALTER TYPE "FileAssetUsage" ADD VALUE IF NOT EXISTS 'content_excel';
ALTER TYPE "FileAssetUsage" ADD VALUE IF NOT EXISTS 'tool_excel';
ALTER TYPE "EntrepreneurToolType" ADD VALUE IF NOT EXISTS 'excel';

ALTER TABLE "tools" RENAME COLUMN "pdf_asset_id" TO "file_asset_id";
ALTER INDEX "tools_pdf_asset_id_key" RENAME TO "tools_file_asset_id_key";
ALTER TABLE "tools" RENAME CONSTRAINT "tools_pdf_asset_id_fkey" TO "tools_file_asset_id_fkey";
