-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('mentor_checkin', 'office_hours', 'investor_prep');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('requested', 'confirmed', 'declined', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "SessionSource" AS ENUM ('entrepreneur_request', 'team_created');

-- CreateEnum
CREATE TYPE "SessionNoteVisibility" AS ENUM ('internal', 'participant');

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "programme_id" TEXT,
    "owner_user_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "type" "SessionType" NOT NULL,
    "topic" TEXT NOT NULL,
    "notes" TEXT,
    "source" "SessionSource" NOT NULL DEFAULT 'entrepreneur_request',
    "status" "SessionStatus" NOT NULL DEFAULT 'requested',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "meeting_provider" TEXT NOT NULL DEFAULT 'google_meet',
    "meeting_url" TEXT,
    "declined_reason" TEXT,
    "cancelled_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_notes" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "visibility" "SessionNoteVisibility" NOT NULL DEFAULT 'internal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_entrepreneur_user_id_status_idx" ON "sessions"("entrepreneur_user_id", "status");

-- CreateIndex
CREATE INDEX "sessions_owner_user_id_status_idx" ON "sessions"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "sessions_programme_id_idx" ON "sessions"("programme_id");

-- CreateIndex
CREATE INDEX "sessions_status_start_at_idx" ON "sessions"("status", "start_at");

-- CreateIndex
CREATE INDEX "sessions_source_status_idx" ON "sessions"("source", "status");

-- CreateIndex
CREATE INDEX "session_notes_session_id_created_at_idx" ON "session_notes"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "session_notes_author_id_idx" ON "session_notes"("author_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
