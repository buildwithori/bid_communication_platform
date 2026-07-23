CREATE TABLE "session_type_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_type_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "session_type_definitions_key_key"
ON "session_type_definitions"("key");

CREATE INDEX "session_type_definitions_active_name_idx"
ON "session_type_definitions"("active", "name");

INSERT INTO "session_type_definitions"
    ("id", "name", "key", "duration_minutes", "active", "updated_at")
VALUES
    ('seed-session-type-mentor-checkin', '1:1 mentor check-in', 'mentor_checkin', 60, true, CURRENT_TIMESTAMP),
    ('seed-session-type-office-hours', 'Office hours', 'office_hours', 30, true, CURRENT_TIMESTAMP),
    ('seed-session-type-investor-prep', 'Investor prep session', 'investor_prep', 60, true, CURRENT_TIMESTAMP);

ALTER TABLE "sessions"
ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- Keep the booked duration stable when a session type's configuration changes.
ALTER TABLE "sessions"
ADD COLUMN "duration_minutes" INTEGER;

UPDATE "sessions" AS "session"
SET "duration_minutes" = "definition"."duration_minutes"
FROM "session_type_definitions" AS "definition"
WHERE "session"."type" = "definition"."key";

ALTER TABLE "sessions"
ALTER COLUMN "duration_minutes" SET NOT NULL;

ALTER TABLE "sessions"
ADD CONSTRAINT "sessions_type_fkey"
FOREIGN KEY ("type") REFERENCES "session_type_definitions"("key")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "company_settings"
DROP COLUMN "default_session_duration_minutes";

DROP TYPE "SessionType";
