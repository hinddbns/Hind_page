-- Raise the free-course introduction limit from 600 to 1,200 characters (multi-paragraph
-- introductions shown above the video). Forward-only: 20261011120000_add_free_course is already
-- applied in production and must not be edited or re-run.
--
-- Only this one CHECK constraint is replaced. No data is touched, and RLS, grants, policies and
-- every other constraint (including FreeCourse_publish_complete) are unchanged. Mirrors
-- FREE_COURSE_LIMITS.introduction in src/lib/freeCourseRules.ts.
--
-- No IF EXISTS on purpose: if the constraint isn't named as expected, this fails loudly (and the
-- transaction rolls back) instead of silently leaving the old 600 limit next to the new one.
-- Apply manually in the Supabase SQL editor, before deploying the matching code.

BEGIN;

ALTER TABLE "FreeCourse" DROP CONSTRAINT "FreeCourse_introduction_length";
ALTER TABLE "FreeCourse"
    ADD CONSTRAINT "FreeCourse_introduction_length" CHECK (char_length("introduction") <= 1200);

COMMIT;

-- Verify (read-only):
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = '"FreeCourse"'::regclass AND conname = 'FreeCourse_introduction_length';
-- expect: CHECK ((char_length(introduction) <= 1200))
