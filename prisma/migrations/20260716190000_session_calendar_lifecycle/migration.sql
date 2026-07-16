-- Extend the session workflow with request targeting and durable Google Calendar identity.
CREATE TYPE "SessionTargetType" AS ENUM ('open_team', 'specific_user');

ALTER TABLE "sessions"
  ADD COLUMN "target_type" "SessionTargetType" NOT NULL DEFAULT 'open_team',
  ADD COLUMN "target_user_id" TEXT,
  ADD COLUMN "calendar_event_id" TEXT;

CREATE TABLE "session_reschedules" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "requested_by_id" TEXT NOT NULL,
  "previous_start_at" TIMESTAMP(3) NOT NULL,
  "previous_end_at" TIMESTAMP(3) NOT NULL,
  "new_start_at" TIMESTAMP(3) NOT NULL,
  "new_end_at" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_reschedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sessions_target_user_id_status_idx" ON "sessions"("target_user_id", "status");
CREATE INDEX "session_reschedules_session_id_created_at_idx" ON "session_reschedules"("session_id", "created_at");
CREATE INDEX "session_reschedules_requested_by_id_idx" ON "session_reschedules"("requested_by_id");

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "session_reschedules"
  ADD CONSTRAINT "session_reschedules_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_reschedules"
  ADD CONSTRAINT "session_reschedules_requested_by_id_fkey"
  FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "session_request_declines" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_request_declines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "session_request_declines_session_id_user_id_key" ON "session_request_declines"("session_id", "user_id");
CREATE INDEX "session_request_declines_user_id_created_at_idx" ON "session_request_declines"("user_id", "created_at");
ALTER TABLE "session_request_declines" ADD CONSTRAINT "session_request_declines_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_request_declines" ADD CONSTRAINT "session_request_declines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "company_settings"
  ADD COLUMN "session_working_days" INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],
  ADD COLUMN "session_workday_start_minutes" INTEGER NOT NULL DEFAULT 540,
  ADD COLUMN "session_workday_end_minutes" INTEGER NOT NULL DEFAULT 1020,
  ADD COLUMN "session_slot_interval_minutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "default_session_duration_minutes" INTEGER NOT NULL DEFAULT 60;
