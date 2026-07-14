-- CreateEnum
CREATE TYPE "ToolRequestStatus" AS ENUM ('under_review', 'in_development', 'built', 'declined');

-- CreateTable
CREATE TABLE "tool_requests" (
    "id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "business_need" TEXT NOT NULL,
    "tool_area_id" TEXT NOT NULL,
    "needed_by" TIMESTAMP(3),
    "status" "ToolRequestStatus" NOT NULL DEFAULT 'under_review',
    "linked_tool_id" TEXT,
    "admin_decision_note" TEXT,
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_requests_entrepreneur_user_id_status_idx" ON "tool_requests"("entrepreneur_user_id", "status");

-- CreateIndex
CREATE INDEX "tool_requests_tool_area_id_idx" ON "tool_requests"("tool_area_id");

-- CreateIndex
CREATE INDEX "tool_requests_linked_tool_id_idx" ON "tool_requests"("linked_tool_id");

-- CreateIndex
CREATE INDEX "tool_requests_decided_by_id_idx" ON "tool_requests"("decided_by_id");

-- CreateIndex
CREATE INDEX "tool_requests_status_created_at_idx" ON "tool_requests"("status", "created_at");

-- AddForeignKey
ALTER TABLE "tool_requests" ADD CONSTRAINT "tool_requests_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_requests" ADD CONSTRAINT "tool_requests_tool_area_id_fkey" FOREIGN KEY ("tool_area_id") REFERENCES "tool_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_requests" ADD CONSTRAINT "tool_requests_linked_tool_id_fkey" FOREIGN KEY ("linked_tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_requests" ADD CONSTRAINT "tool_requests_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
