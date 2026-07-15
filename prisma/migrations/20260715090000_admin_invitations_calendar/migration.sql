CREATE TYPE "CalendarProvider" AS ENUM ('google');

CREATE TYPE "CalendarConnectionStatus" AS ENUM ('connected', 'error', 'revoked');

ALTER TABLE "invitations" DROP COLUMN "note";

CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "provider_account_email" TEXT NOT NULL,
    "encrypted_access_token" TEXT NOT NULL,
    "encrypted_refresh_token" TEXT NOT NULL,
    "scopes" TEXT[],
    "status" "CalendarConnectionStatus" NOT NULL DEFAULT 'connected',
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "calendar_connections_provider_status_idx"
ON "calendar_connections"("provider", "status");

CREATE UNIQUE INDEX "calendar_connections_user_id_provider_key"
ON "calendar_connections"("user_id", "provider");

ALTER TABLE "calendar_connections"
ADD CONSTRAINT "calendar_connections_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
