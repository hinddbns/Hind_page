-- Optional Bunny Stream video for the standalone workshop landing page (/atelier), edited at
-- /admin/parametres. The page copy itself is code-defined (dictionary `workshop`); only the video
-- reference and its publish switch live here, on the existing Settings singleton.
--
-- Additive and forward-only: two nullable text columns and one boolean defaulting to false, so the
-- page keeps showing its illustration until a video is added AND published. Apply manually in the
-- Supabase SQL editor BEFORE saving the workshop video form (the page itself tolerates the columns
-- being absent and simply shows no video).

BEGIN;

ALTER TABLE "Settings"
  ADD COLUMN "workshopBunnyLibraryId" TEXT,
  ADD COLUMN "workshopBunnyVideoId" TEXT,
  ADD COLUMN "workshopVideoPublished" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Settings"
  ADD CONSTRAINT "Settings_workshop_library_id_format"
    CHECK ("workshopBunnyLibraryId" IS NULL OR "workshopBunnyLibraryId" ~ '^[1-9][0-9]{0,9}$'),
  ADD CONSTRAINT "Settings_workshop_video_id_format"
    CHECK ("workshopBunnyVideoId" IS NULL OR "workshopBunnyVideoId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  ADD CONSTRAINT "Settings_workshop_publish_complete"
    CHECK (NOT "workshopVideoPublished" OR ("workshopBunnyLibraryId" IS NOT NULL AND "workshopBunnyVideoId" IS NOT NULL));

COMMIT;

-- Verify (read-only):
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
-- WHERE table_name = 'Settings' AND column_name LIKE 'workshop%';
-- SELECT id, "workshopBunnyLibraryId", "workshopBunnyVideoId", "workshopVideoPublished" FROM "Settings";
