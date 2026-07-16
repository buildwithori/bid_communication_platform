ALTER TABLE "audit_outbox"
ADD COLUMN "next_attempt_at" TIMESTAMP(3);

DROP INDEX "audit_outbox_status_created_at_idx";

CREATE INDEX "audit_outbox_status_next_attempt_at_created_at_idx"
ON "audit_outbox"("status", "next_attempt_at", "created_at");
