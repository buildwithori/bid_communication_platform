UPDATE "businesses"
SET "status" = 'inactive'
WHERE "status" = 'archived';

ALTER TYPE "BusinessStatus" RENAME TO "BusinessStatus_old";

CREATE TYPE "BusinessStatus" AS ENUM ('active', 'inactive');

ALTER TABLE "businesses"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "businesses"
ALTER COLUMN "status" TYPE "BusinessStatus"
USING ("status"::text::"BusinessStatus");

ALTER TABLE "businesses"
ALTER COLUMN "status" SET DEFAULT 'active';

DROP TYPE "BusinessStatus_old";
