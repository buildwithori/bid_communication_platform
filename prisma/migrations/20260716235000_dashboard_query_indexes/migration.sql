CREATE INDEX "business_memberships_joined_at_id_idx"
ON "business_memberships"("joined_at", "id");

CREATE INDEX "programme_access_grants_programme_id_revoked_at_idx"
ON "programme_access_grants"("programme_id", "revoked_at");

CREATE INDEX "fundraising_rounds_currency_date_idx"
ON "fundraising_rounds"("currency", "date");

DROP INDEX "learner_content_progress_status_idx";

CREATE INDEX "learner_content_progress_status_completed_at_idx"
ON "learner_content_progress"("status", "completed_at");

CREATE INDEX "learner_content_progress_entrepreneur_user_id_status_completed_at_idx"
ON "learner_content_progress"("entrepreneur_user_id", "status", "completed_at");
