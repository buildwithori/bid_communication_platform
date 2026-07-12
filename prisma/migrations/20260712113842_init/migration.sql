-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('entrepreneur', 'admin', 'trainer');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'active', 'inactive');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "BusinessSource" AS ENUM ('self_registered', 'admin_invited');

-- CreateEnum
CREATE TYPE "BusinessRelationship" AS ENUM ('owner', 'representative');

-- CreateEnum
CREATE TYPE "TrainerRoleLabel" AS ENUM ('mentor', 'trainer', 'guest_expert', 'investment_analyst');

-- CreateEnum
CREATE TYPE "TrainerAccessLevel" AS ENUM ('full', 'guest');

-- CreateEnum
CREATE TYPE "TrainerCapabilityStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ProgrammeAccessType" AS ENUM ('free', 'assigned');

-- CreateEnum
CREATE TYPE "ContentItemType" AS ENUM ('video', 'pdf', 'tool');

-- CreateEnum
CREATE TYPE "ContentItemStatus" AS ENUM ('draft', 'processing', 'ready', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('pending', 'processing', 'ready', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "ToolLinkSource" AS ENUM ('library', 'custom');

-- CreateEnum
CREATE TYPE "LearnerProgressStatus" AS ENUM ('not_started', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "ProgressSource" AS ENUM ('player', 'explicit_action', 'system');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "email_verified_at" TIMESTAMP(3),
    "invited_by_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "singleton_key" TEXT NOT NULL DEFAULT 'default',
    "periodic_update_overdue_after_days" INTEGER NOT NULL DEFAULT 30,
    "module_completion_deliverable_due_days" INTEGER,
    "default_currency" TEXT NOT NULL DEFAULT 'USD',
    "default_timezone" TEXT NOT NULL DEFAULT 'UTC',
    "default_session_provider" TEXT NOT NULL DEFAULT 'google_meet',
    "in_app_notifications_enabled_by_default" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications_enabled_by_default" BOOLEAN NOT NULL DEFAULT true,
    "reminder_notifications_enabled_by_default" BOOLEAN NOT NULL DEFAULT true,
    "weekly_digest_enabled_by_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_goal_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "requires_target_amount" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_goal_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "sector_id" TEXT,
    "stage_id" TEXT,
    "onboarding_completed_at" TIMESTAMP(3),
    "status" "BusinessStatus" NOT NULL DEFAULT 'active',
    "source" "BusinessSource" NOT NULL DEFAULT 'self_registered',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "relationship" "BusinessRelationship" NOT NULL DEFAULT 'representative',
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_capabilities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_label" "TrainerRoleLabel" NOT NULL DEFAULT 'trainer',
    "access_level" "TrainerAccessLevel" NOT NULL DEFAULT 'full',
    "access_expires_on" TIMESTAMP(3),
    "status" "TrainerCapabilityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_specialisms" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_specialisms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programmes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "access_type" "ProgrammeAccessType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "max_entrepreneurs" INTEGER NOT NULL,
    "published_at" TIMESTAMP(3),
    "published_by_id" TEXT,
    "archived_at" TIMESTAMP(3),
    "archived_by_id" TEXT,
    "archive_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_access_grants" (
    "id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "granted_by_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_reusable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_modules" (
    "id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContentItemType" NOT NULL,
    "trainer_id" TEXT,
    "duration_seconds" INTEGER,
    "status" "ContentItemStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_content_items" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "content_item_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_assets" (
    "id" TEXT NOT NULL,
    "content_item_id" TEXT NOT NULL,
    "mux_asset_id" TEXT,
    "mux_upload_id" TEXT,
    "playback_id" TEXT,
    "duration" INTEGER,
    "status" "AssetStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" TEXT NOT NULL,
    "content_item_id" TEXT,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_tool_links" (
    "id" TEXT NOT NULL,
    "content_item_id" TEXT NOT NULL,
    "tool_id" TEXT,
    "external_url" TEXT,
    "source" "ToolLinkSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_tool_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_ratings" (
    "id" TEXT NOT NULL,
    "content_item_id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "trainer_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_content_progress" (
    "id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "programme_id" TEXT,
    "module_id" TEXT,
    "content_item_id" TEXT NOT NULL,
    "status" "LearnerProgressStatus" NOT NULL DEFAULT 'not_started',
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "last_position_seconds" INTEGER,
    "duration_seconds" INTEGER,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_opened_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ProgressSource" NOT NULL DEFAULT 'player',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learner_content_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_module_progress" (
    "id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "status" "LearnerProgressStatus" NOT NULL DEFAULT 'not_started',
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "completed_content_count" INTEGER NOT NULL DEFAULT 0,
    "total_content_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learner_module_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_programme_progress" (
    "id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "status" "LearnerProgressStatus" NOT NULL DEFAULT 'not_started',
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "completed_module_count" INTEGER NOT NULL DEFAULT 0,
    "total_module_count" INTEGER NOT NULL DEFAULT 0,
    "completed_content_count" INTEGER NOT NULL DEFAULT 0,
    "total_content_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learner_programme_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_invited_by_id_idx" ON "users"("invited_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_settings_singleton_key_key" ON "company_settings"("singleton_key");

-- CreateIndex
CREATE UNIQUE INDEX "sectors_key_key" ON "sectors"("key");

-- CreateIndex
CREATE INDEX "sectors_active_idx" ON "sectors"("active");

-- CreateIndex
CREATE UNIQUE INDEX "business_stages_key_key" ON "business_stages"("key");

-- CreateIndex
CREATE INDEX "business_stages_active_idx" ON "business_stages"("active");

-- CreateIndex
CREATE UNIQUE INDEX "programme_goal_types_key_key" ON "programme_goal_types"("key");

-- CreateIndex
CREATE INDEX "programme_goal_types_active_idx" ON "programme_goal_types"("active");

-- CreateIndex
CREATE UNIQUE INDEX "tool_areas_key_key" ON "tool_areas"("key");

-- CreateIndex
CREATE INDEX "tool_areas_active_idx" ON "tool_areas"("active");

-- CreateIndex
CREATE INDEX "businesses_sector_id_idx" ON "businesses"("sector_id");

-- CreateIndex
CREATE INDEX "businesses_stage_id_idx" ON "businesses"("stage_id");

-- CreateIndex
CREATE INDEX "businesses_status_source_idx" ON "businesses"("status", "source");

-- CreateIndex
CREATE INDEX "business_memberships_business_id_idx" ON "business_memberships"("business_id");

-- CreateIndex
CREATE INDEX "business_memberships_user_id_is_primary_idx" ON "business_memberships"("user_id", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "business_memberships_user_id_business_id_key" ON "business_memberships"("user_id", "business_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_capabilities_user_id_key" ON "trainer_capabilities"("user_id");

-- CreateIndex
CREATE INDEX "trainer_capabilities_status_access_level_idx" ON "trainer_capabilities"("status", "access_level");

-- CreateIndex
CREATE INDEX "trainer_specialisms_sector_id_idx" ON "trainer_specialisms"("sector_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_specialisms_user_id_sector_id_key" ON "trainer_specialisms"("user_id", "sector_id");

-- CreateIndex
CREATE INDEX "programmes_access_type_idx" ON "programmes"("access_type");

-- CreateIndex
CREATE INDEX "programmes_published_at_archived_at_idx" ON "programmes"("published_at", "archived_at");

-- CreateIndex
CREATE INDEX "programmes_start_date_end_date_idx" ON "programmes"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "programme_access_grants_entrepreneur_user_id_revoked_at_idx" ON "programme_access_grants"("entrepreneur_user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "programme_access_grants_granted_by_id_idx" ON "programme_access_grants"("granted_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "programme_access_grants_programme_id_entrepreneur_user_id_key" ON "programme_access_grants"("programme_id", "entrepreneur_user_id");

-- CreateIndex
CREATE INDEX "programme_modules_module_id_idx" ON "programme_modules"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "programme_modules_programme_id_module_id_key" ON "programme_modules"("programme_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "programme_modules_programme_id_position_key" ON "programme_modules"("programme_id", "position");

-- CreateIndex
CREATE INDEX "content_items_type_status_idx" ON "content_items"("type", "status");

-- CreateIndex
CREATE INDEX "content_items_trainer_id_idx" ON "content_items"("trainer_id");

-- CreateIndex
CREATE INDEX "module_content_items_content_item_id_idx" ON "module_content_items"("content_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_content_items_module_id_content_item_id_key" ON "module_content_items"("module_id", "content_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_content_items_module_id_position_key" ON "module_content_items"("module_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "video_assets_content_item_id_key" ON "video_assets"("content_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_assets_mux_asset_id_key" ON "video_assets"("mux_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_assets_mux_upload_id_key" ON "video_assets"("mux_upload_id");

-- CreateIndex
CREATE INDEX "video_assets_status_idx" ON "video_assets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_storage_key_key" ON "file_assets"("storage_key");

-- CreateIndex
CREATE INDEX "file_assets_content_item_id_idx" ON "file_assets"("content_item_id");

-- CreateIndex
CREATE INDEX "file_assets_status_idx" ON "file_assets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "content_tool_links_content_item_id_key" ON "content_tool_links"("content_item_id");

-- CreateIndex
CREATE INDEX "content_tool_links_tool_id_idx" ON "content_tool_links"("tool_id");

-- CreateIndex
CREATE INDEX "content_ratings_entrepreneur_user_id_idx" ON "content_ratings"("entrepreneur_user_id");

-- CreateIndex
CREATE INDEX "content_ratings_trainer_id_idx" ON "content_ratings"("trainer_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_ratings_content_item_id_entrepreneur_user_id_key" ON "content_ratings"("content_item_id", "entrepreneur_user_id");

-- CreateIndex
CREATE INDEX "learner_content_progress_programme_id_module_id_idx" ON "learner_content_progress"("programme_id", "module_id");

-- CreateIndex
CREATE INDEX "learner_content_progress_content_item_id_idx" ON "learner_content_progress"("content_item_id");

-- CreateIndex
CREATE INDEX "learner_content_progress_status_idx" ON "learner_content_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "learner_content_progress_entrepreneur_user_id_programme_id__key" ON "learner_content_progress"("entrepreneur_user_id", "programme_id", "module_id", "content_item_id");

-- CreateIndex
CREATE INDEX "learner_module_progress_programme_id_module_id_idx" ON "learner_module_progress"("programme_id", "module_id");

-- CreateIndex
CREATE INDEX "learner_module_progress_status_idx" ON "learner_module_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "learner_module_progress_entrepreneur_user_id_programme_id_m_key" ON "learner_module_progress"("entrepreneur_user_id", "programme_id", "module_id");

-- CreateIndex
CREATE INDEX "learner_programme_progress_programme_id_idx" ON "learner_programme_progress"("programme_id");

-- CreateIndex
CREATE INDEX "learner_programme_progress_status_idx" ON "learner_programme_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "learner_programme_progress_entrepreneur_user_id_programme_i_key" ON "learner_programme_progress"("entrepreneur_user_id", "programme_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "business_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_capabilities" ADD CONSTRAINT "trainer_capabilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_specialisms" ADD CONSTRAINT "trainer_specialisms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_specialisms" ADD CONSTRAINT "trainer_specialisms_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_archived_by_id_fkey" FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_access_grants" ADD CONSTRAINT "programme_access_grants_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_access_grants" ADD CONSTRAINT "programme_access_grants_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_access_grants" ADD CONSTRAINT "programme_access_grants_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_modules" ADD CONSTRAINT "programme_modules_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_modules" ADD CONSTRAINT "programme_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_content_items" ADD CONSTRAINT "module_content_items_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_content_items" ADD CONSTRAINT "module_content_items_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tool_links" ADD CONSTRAINT "content_tool_links_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ratings" ADD CONSTRAINT "content_ratings_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ratings" ADD CONSTRAINT "content_ratings_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ratings" ADD CONSTRAINT "content_ratings_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_content_progress" ADD CONSTRAINT "learner_content_progress_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_content_progress" ADD CONSTRAINT "learner_content_progress_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_content_progress" ADD CONSTRAINT "learner_content_progress_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_content_progress" ADD CONSTRAINT "learner_content_progress_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_module_progress" ADD CONSTRAINT "learner_module_progress_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_module_progress" ADD CONSTRAINT "learner_module_progress_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_module_progress" ADD CONSTRAINT "learner_module_progress_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_programme_progress" ADD CONSTRAINT "learner_programme_progress_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_programme_progress" ADD CONSTRAINT "learner_programme_progress_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
