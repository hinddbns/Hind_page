-- Standalone free course (/cours-gratuit), managed from /admin/cours-gratuit.
--
-- A single-row table (id = 'main'), following the "Settings" singleton pattern. Deliberately
-- NOT a "Course" row: Course requires an audience and a price, participates in enrollments and
-- payments, and is read by every catalog — the free course must appear in none of them.
--
-- Apply manually in the Supabase SQL editor (see docs/ARCHITECTURE.md § Free course). Purely
-- additive: no existing table, type, grant or policy is touched.
--
-- Security model (same posture as the 14 existing tables, see 20260826130000): RLS enabled with
-- zero policies, no privileges at all for PUBLIC/anon/authenticated, and only the privileges the
-- application actually uses granted to service_role (which bypasses RLS). The explicit REVOKE is
-- required, not decorative: Supabase's default privileges can grant ALL on newly created public
-- tables to anon/authenticated, and the anon key is public — without the REVOKE + RLS, drafts
-- would be readable straight through PostgREST. Run the verification queries in
-- docs/ARCHITECTURE.md after applying.

-- One transaction: either everything below applies, or nothing does. Not re-runnable by design
-- (CREATE TYPE/TABLE fail if they already exist) — check for "FreeCourse" before applying.
BEGIN;

-- CreateEnum
CREATE TYPE "VideoAspect" AS ENUM ('LANDSCAPE', 'PORTRAIT', 'SQUARE');

-- CreateTable
CREATE TABLE "FreeCourse" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL DEFAULT '',
    "eyebrow" TEXT,
    "introduction" TEXT NOT NULL DEFAULT '',
    "bunnyLibraryId" TEXT,
    "bunnyVideoId" TEXT,
    "videoAspect" "VideoAspect" NOT NULL DEFAULT 'LANDSCAPE',
    "showHost" BOOLEAN NOT NULL DEFAULT true,
    "hostIntro" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "indexable" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeCourse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FreeCourse_singleton" CHECK ("id" = 'main'),
    CONSTRAINT "FreeCourse_title_length" CHECK (char_length("title") <= 120),
    CONSTRAINT "FreeCourse_eyebrow_length" CHECK ("eyebrow" IS NULL OR char_length("eyebrow") <= 60),
    CONSTRAINT "FreeCourse_introduction_length" CHECK (char_length("introduction") <= 600),
    CONSTRAINT "FreeCourse_hostIntro_length" CHECK ("hostIntro" IS NULL OR char_length("hostIntro") <= 200),
    CONSTRAINT "FreeCourse_seoTitle_length" CHECK ("seoTitle" IS NULL OR char_length("seoTitle") <= 70),
    CONSTRAINT "FreeCourse_seoDescription_length" CHECK ("seoDescription" IS NULL OR char_length("seoDescription") <= 160),
    CONSTRAINT "FreeCourse_bunnyLibraryId_format" CHECK ("bunnyLibraryId" IS NULL OR "bunnyLibraryId" ~ '^[1-9][0-9]{0,9}$'),
    CONSTRAINT "FreeCourse_bunnyVideoId_format" CHECK (
        "bunnyVideoId" IS NULL
        OR "bunnyVideoId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
    -- Mirrors getPublishBlockers() in src/lib/freeCourseRules.ts: the database itself refuses a
    -- published row that is missing its title, introduction, or Bunny references.
    CONSTRAINT "FreeCourse_publish_complete" CHECK (
        NOT "published"
        OR (
            btrim("title") <> ''
            AND btrim("introduction") <> ''
            AND "bunnyLibraryId" IS NOT NULL
            AND "bunnyVideoId" IS NOT NULL
        )
    )
);

-- Security
ALTER TABLE "FreeCourse" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "FreeCourse" FROM PUBLIC;
REVOKE ALL ON TABLE "FreeCourse" FROM anon;
REVOKE ALL ON TABLE "FreeCourse" FROM authenticated;
-- Reset service_role too (default privileges may have granted it ALL), then grant only what the
-- app uses. No DELETE: the row is never deleted by the application (unpublishing hides it).
REVOKE ALL ON TABLE "FreeCourse" FROM service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE "FreeCourse" TO service_role;

-- Seed the singleton as an empty, unpublished draft.
INSERT INTO "FreeCourse" ("id") VALUES ('main') ON CONFLICT ("id") DO NOTHING;

COMMIT;
