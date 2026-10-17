-- Per-group access link for the free course: the public page moves to /free-course/{accessCode}.
-- The admin types a name per group (e.g. groupe-octobre); changing it, or passing the optional
-- accessExpiresOn date (inclusive, Africa/Casablanca calendar day), makes the previous link 404.
-- No redirect by design: old groups must lose access.
--
-- Additive and forward-only: two nullable columns + a format CHECK. Existing data, RLS, grants,
-- policies and every other constraint are unchanged. Not added to FreeCourse_publish_complete,
-- because the currently published row has no code yet (a publish blocker in the app enforces it
-- instead). Apply manually in the Supabase SQL editor BEFORE deploying the matching code; until an
-- admin saves a group name, the page is reachable by nobody (admins can still preview).

BEGIN;

ALTER TABLE "FreeCourse" ADD COLUMN "accessCode" TEXT;
ALTER TABLE "FreeCourse" ADD COLUMN "accessExpiresOn" DATE;
ALTER TABLE "FreeCourse" ADD CONSTRAINT "FreeCourse_accessCode_format" CHECK (
    "accessCode" IS NULL
    OR ("accessCode" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length("accessCode") BETWEEN 3 AND 40)
);

COMMIT;

-- Verify (read-only):
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
-- WHERE table_name = 'FreeCourse' AND column_name IN ('accessCode', 'accessExpiresOn');
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = '"FreeCourse"'::regclass AND conname = 'FreeCourse_accessCode_format';
