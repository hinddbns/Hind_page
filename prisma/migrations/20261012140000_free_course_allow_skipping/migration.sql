-- Admin toggle for the free course video: when false, /cours-gratuit loads the Bunny Player.js
-- seek guard (src/components/BunnySeekGuardPlayer.tsx) that snaps forward seeks back to the
-- furthest genuinely watched point. A browser-side deterrent, not strict enforcement.
--
-- Additive and forward-only: one NOT NULL column with a DEFAULT of true, so the existing row keeps
-- today's behavior (skipping allowed) and no other column, constraint, RLS setting, grant or policy
-- changes. Apply manually in the Supabase SQL editor BEFORE deploying the matching code (the admin
-- save writes this column).

BEGIN;

ALTER TABLE "FreeCourse" ADD COLUMN "allowSkipping" BOOLEAN NOT NULL DEFAULT true;

COMMIT;

-- Verify (read-only):
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
-- WHERE table_name = 'FreeCourse' AND column_name = 'allowSkipping';
-- expect: allowSkipping | boolean | NO | true
-- SELECT id, published, "allowSkipping", "updatedAt" FROM "FreeCourse";
