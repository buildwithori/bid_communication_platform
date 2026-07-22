ALTER TABLE "content_ratings"
ADD COLUMN "programme_id" TEXT,
ADD COLUMN "module_id" TEXT;

-- Prefer the placement the learner interacted with most recently.
WITH latest_progress AS (
  SELECT DISTINCT ON (cr."id")
    cr."id" AS "rating_id",
    lcp."programme_id",
    lcp."module_id"
  FROM "content_ratings" cr
  JOIN "learner_content_progress" lcp
    ON lcp."entrepreneur_user_id" = cr."entrepreneur_user_id"
   AND lcp."content_item_id" = cr."content_item_id"
   AND lcp."programme_id" IS NOT NULL
   AND lcp."module_id" IS NOT NULL
  JOIN "module_content_items" mci
    ON mci."module_id" = lcp."module_id"
   AND mci."content_item_id" = lcp."content_item_id"
  JOIN "programme_modules" pm
    ON pm."programme_id" = lcp."programme_id"
   AND pm."module_id" = lcp."module_id"
  ORDER BY
    cr."id",
    lcp."last_opened_at" DESC NULLS LAST,
    lcp."last_synced_at" DESC
)
UPDATE "content_ratings" cr
SET
  "programme_id" = latest_progress."programme_id",
  "module_id" = latest_progress."module_id"
FROM latest_progress
WHERE cr."id" = latest_progress."rating_id";

-- Fall back to a valid curriculum placement for legacy ratings without progress.
WITH first_placement AS (
  SELECT DISTINCT ON (cr."id")
    cr."id" AS "rating_id",
    pm."programme_id",
    mci."module_id"
  FROM "content_ratings" cr
  JOIN "module_content_items" mci
    ON mci."content_item_id" = cr."content_item_id"
  JOIN "programme_modules" pm
    ON pm."module_id" = mci."module_id"
  WHERE cr."programme_id" IS NULL OR cr."module_id" IS NULL
  ORDER BY cr."id", pm."position", mci."position", pm."programme_id"
)
UPDATE "content_ratings" cr
SET
  "programme_id" = first_placement."programme_id",
  "module_id" = first_placement."module_id"
FROM first_placement
WHERE cr."id" = first_placement."rating_id";

-- A rating cannot remain meaningful after every curriculum placement is gone.
DELETE FROM "content_ratings"
WHERE "programme_id" IS NULL OR "module_id" IS NULL;

ALTER TABLE "content_ratings"
ALTER COLUMN "programme_id" SET NOT NULL,
ALTER COLUMN "module_id" SET NOT NULL;

DROP INDEX "content_ratings_content_item_id_entrepreneur_user_id_key";

CREATE UNIQUE INDEX "content_ratings_programme_id_module_id_content_item_id_entrepreneur_user_id_key"
ON "content_ratings"("programme_id", "module_id", "content_item_id", "entrepreneur_user_id");

CREATE INDEX "content_ratings_programme_id_idx" ON "content_ratings"("programme_id");
CREATE INDEX "content_ratings_module_id_idx" ON "content_ratings"("module_id");

ALTER TABLE "content_ratings"
ADD CONSTRAINT "content_ratings_programme_id_fkey"
FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_ratings"
ADD CONSTRAINT "content_ratings_module_id_fkey"
FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
