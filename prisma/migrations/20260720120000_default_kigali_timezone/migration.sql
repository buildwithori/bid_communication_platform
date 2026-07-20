ALTER TABLE "company_settings"
ALTER COLUMN "default_timezone" SET DEFAULT 'Africa/Kigali';

UPDATE "company_settings"
SET "default_timezone" = 'Africa/Kigali'
WHERE "default_timezone" IN ('UTC', 'Africa/Accra');

ALTER TABLE "sessions"
ALTER COLUMN "timezone" SET DEFAULT 'Africa/Kigali';
