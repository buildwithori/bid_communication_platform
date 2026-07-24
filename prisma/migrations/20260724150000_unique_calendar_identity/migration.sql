ALTER TABLE "calendar_connections"
ADD COLUMN "provider_account_id" TEXT;

UPDATE "calendar_connections"
SET "provider_account_email" = LOWER(TRIM("provider_account_email"));

WITH "ranked_connections" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "provider", "provider_account_email"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS "connection_rank"
  FROM "calendar_connections"
)
DELETE FROM "calendar_connections"
WHERE "id" IN (
  SELECT "id"
  FROM "ranked_connections"
  WHERE "connection_rank" > 1
);

CREATE UNIQUE INDEX "calendar_connections_provider_provider_account_id_key"
ON "calendar_connections"("provider", "provider_account_id");

CREATE UNIQUE INDEX "calendar_connections_provider_provider_account_email_key"
ON "calendar_connections"("provider", "provider_account_email");
