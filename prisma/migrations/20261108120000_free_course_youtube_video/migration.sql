-- YouTube as an alternative video source for the free course (/free-course/{code}). The admin
-- pastes either a Bunny or a YouTube link into the same field; a YouTube link stores only its
-- 11-character video ID here and clears the Bunny columns (and vice versa).
--
-- Additive and forward-only: one nullable column, a format CHECK, a "one source at most" CHECK,
-- and FreeCourse_publish_complete re-created so a published row may have EITHER both Bunny IDs OR
-- a YouTube ID. The currently published row (Bunny) satisfies the new constraint unchanged. RLS,
-- grants and policies are untouched. Apply manually in the Supabase SQL editor; until then the
-- admin save refuses a YouTube link with a clear message and Bunny keeps working as before.

BEGIN;

ALTER TABLE "FreeCourse" ADD COLUMN "youtubeVideoId" TEXT;

ALTER TABLE "FreeCourse" ADD CONSTRAINT "FreeCourse_youtubeVideoId_format" CHECK (
    "youtubeVideoId" IS NULL OR "youtubeVideoId" ~ '^[A-Za-z0-9_-]{11}$'
);

ALTER TABLE "FreeCourse" ADD CONSTRAINT "FreeCourse_single_video_source" CHECK (
    "youtubeVideoId" IS NULL OR ("bunnyLibraryId" IS NULL AND "bunnyVideoId" IS NULL)
);

-- Mirrors getPublishBlockers() in src/lib/freeCourseRules.ts.
ALTER TABLE "FreeCourse" DROP CONSTRAINT "FreeCourse_publish_complete";
ALTER TABLE "FreeCourse" ADD CONSTRAINT "FreeCourse_publish_complete" CHECK (
    NOT "published"
    OR (
        btrim("title") <> ''
        AND btrim("introduction") <> ''
        AND (
            ("bunnyLibraryId" IS NOT NULL AND "bunnyVideoId" IS NOT NULL)
            OR "youtubeVideoId" IS NOT NULL
        )
    )
);

COMMIT;

-- Verify (read-only):
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
-- WHERE table_name = 'FreeCourse' AND column_name = 'youtubeVideoId';
-- expect: youtubeVideoId | text | YES
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = '"FreeCourse"'::regclass
--   AND conname IN ('FreeCourse_youtubeVideoId_format', 'FreeCourse_single_video_source', 'FreeCourse_publish_complete');
