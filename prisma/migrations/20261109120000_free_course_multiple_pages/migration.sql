-- Several free course pages instead of one: each FreeCourse row is its own page at
-- /course/{accessCode}, created from /admin/cours-gratuit. The original row keeps id = 'main' and
-- every value it has today; new rows get a server-generated UUID.
--
-- Additive and forward-only. No row is inserted, updated or deleted. RLS, grants (service_role
-- already has INSERT) and every other constraint are unchanged.
--   * FreeCourse_singleton is dropped, so rows other than 'main' can exist.
--   * The 'main' default on "id" is dropped, so an insert that forgets its id fails instead of
--     colliding with the original row.
--   * "createdAt" orders the admin list; the existing row gets the time this migration runs.
--   * accessCode becomes unique: the public page looks a row up by it. NULLs stay allowed (and
--     distinct), as before.
--
-- Compatible with the code deployed before it: that code only ever reads and writes id = 'main'
-- and never sets createdAt. Apply manually in the Supabase SQL editor BEFORE deploying the code
-- that lists and creates pages. Run the pre-check first; it must return no rows.

-- Pre-check (read-only): duplicate access codes would make the unique index fail.
-- SELECT "accessCode", count(*) FROM "FreeCourse"
-- WHERE "accessCode" IS NOT NULL GROUP BY "accessCode" HAVING count(*) > 1;

BEGIN;

ALTER TABLE "FreeCourse" DROP CONSTRAINT "FreeCourse_singleton";
ALTER TABLE "FreeCourse" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "FreeCourse" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "FreeCourse_accessCode_key" ON "FreeCourse" ("accessCode");

COMMIT;

-- Verify (read-only):
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = '"FreeCourse"'::regclass AND conname = 'FreeCourse_singleton';
-- expect: no rows
-- SELECT column_default FROM information_schema.columns
-- WHERE table_name = 'FreeCourse' AND column_name = 'id';
-- expect: NULL
-- SELECT indexdef FROM pg_indexes WHERE tablename = 'FreeCourse' AND indexname = 'FreeCourse_accessCode_key';
-- SELECT "id", "accessCode", "published", "createdAt" FROM "FreeCourse";
-- expect: the 'main' row, unchanged, now with a createdAt
