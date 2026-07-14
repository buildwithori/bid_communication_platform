-- CreateEnum
CREATE TYPE "DeliverableDueType" AS ENUM ('fixed_date', 'module_completion', 'recurring');

-- CreateEnum
CREATE TYPE "DeliverableRecurringCadence" AS ENUM ('monthly', 'quarterly', 'six_monthly');

-- CreateEnum
CREATE TYPE "DeliverableRequiredScope" AS ENUM ('all', 'stage');

-- CreateEnum
CREATE TYPE "DeliverableInstanceStatus" AS ENUM ('not_submitted', 'submitted', 'changes_required', 'approved', 'overdue');

-- CreateEnum
CREATE TYPE "DeliverableReviewDecision" AS ENUM ('approved', 'changes_required');

-- CreateTable
CREATE TABLE "programme_deliverable_rules" (
    "id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "due_type" "DeliverableDueType" NOT NULL,
    "due_date" TIMESTAMP(3),
    "due_after_module_id" TEXT,
    "recurring_cadence" "DeliverableRecurringCadence",
    "required_for_scope" "DeliverableRequiredScope" NOT NULL DEFAULT 'all',
    "required_stage_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_deliverable_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverable_instances" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "DeliverableInstanceStatus" NOT NULL DEFAULT 'not_submitted',
    "due_updated_at" TIMESTAMP(3),
    "due_updated_by_id" TEXT,
    "due_update_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverable_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverable_submissions" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "submitted_by_id" TEXT NOT NULL,
    "file_asset_id" TEXT NOT NULL,
    "note" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverable_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverable_reviews" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewer_role" "UserRole" NOT NULL,
    "decision" "DeliverableReviewDecision" NOT NULL,
    "feedback" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliverable_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "programme_deliverable_rules_programme_id_active_idx" ON "programme_deliverable_rules"("programme_id", "active");
CREATE INDEX "programme_deliverable_rules_due_type_idx" ON "programme_deliverable_rules"("due_type");
CREATE INDEX "programme_deliverable_rules_due_after_module_id_idx" ON "programme_deliverable_rules"("due_after_module_id");
CREATE INDEX "programme_deliverable_rules_required_stage_id_idx" ON "programme_deliverable_rules"("required_stage_id");
CREATE INDEX "deliverable_instances_entrepreneur_user_id_status_idx" ON "deliverable_instances"("entrepreneur_user_id", "status");
CREATE INDEX "deliverable_instances_programme_id_status_idx" ON "deliverable_instances"("programme_id", "status");
CREATE INDEX "deliverable_instances_due_date_idx" ON "deliverable_instances"("due_date");
CREATE INDEX "deliverable_instances_due_updated_by_id_idx" ON "deliverable_instances"("due_updated_by_id");
CREATE UNIQUE INDEX "deliverable_instances_rule_id_entrepreneur_user_id_programme_id_key" ON "deliverable_instances"("rule_id", "entrepreneur_user_id", "programme_id");
CREATE INDEX "deliverable_submissions_instance_id_submitted_at_idx" ON "deliverable_submissions"("instance_id", "submitted_at");
CREATE INDEX "deliverable_submissions_submitted_by_id_idx" ON "deliverable_submissions"("submitted_by_id");
CREATE INDEX "deliverable_submissions_file_asset_id_idx" ON "deliverable_submissions"("file_asset_id");
CREATE INDEX "deliverable_reviews_submission_id_created_at_idx" ON "deliverable_reviews"("submission_id", "created_at");
CREATE INDEX "deliverable_reviews_reviewer_id_idx" ON "deliverable_reviews"("reviewer_id");
CREATE INDEX "deliverable_reviews_decision_idx" ON "deliverable_reviews"("decision");

-- AddForeignKey
ALTER TABLE "programme_deliverable_rules" ADD CONSTRAINT "programme_deliverable_rules_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "programme_deliverable_rules" ADD CONSTRAINT "programme_deliverable_rules_due_after_module_id_fkey" FOREIGN KEY ("due_after_module_id") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "programme_deliverable_rules" ADD CONSTRAINT "programme_deliverable_rules_required_stage_id_fkey" FOREIGN KEY ("required_stage_id") REFERENCES "business_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deliverable_instances" ADD CONSTRAINT "deliverable_instances_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "programme_deliverable_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliverable_instances" ADD CONSTRAINT "deliverable_instances_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliverable_instances" ADD CONSTRAINT "deliverable_instances_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliverable_instances" ADD CONSTRAINT "deliverable_instances_due_updated_by_id_fkey" FOREIGN KEY ("due_updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deliverable_submissions" ADD CONSTRAINT "deliverable_submissions_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "deliverable_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliverable_submissions" ADD CONSTRAINT "deliverable_submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliverable_submissions" ADD CONSTRAINT "deliverable_submissions_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliverable_reviews" ADD CONSTRAINT "deliverable_reviews_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "deliverable_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliverable_reviews" ADD CONSTRAINT "deliverable_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
