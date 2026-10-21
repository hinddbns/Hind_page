// Pure helpers for the standalone workshop landing page (/atelier). No database import, so tests
// can run without credentials.
import { isValidBunnyLibraryId, isValidBunnyVideoId, type BunnyVideoRef } from "@/lib/bunny";

export const WORKSHOP_PATH = "/atelier";

type WorkshopVideoSettings = {
  workshopBunnyLibraryId?: string | null;
  workshopBunnyVideoId?: string | null;
  workshopVideoPublished?: boolean | null;
};

/**
 * The video to embed, or `null` while it is unpublished, incomplete or invalid. Fields are optional
 * so the page keeps rendering (without a video) before the Settings migration is applied.
 */
export function getPublishedWorkshopVideo(settings: WorkshopVideoSettings | null | undefined): BunnyVideoRef | null {
  if (settings?.workshopVideoPublished !== true) return null;
  const libraryId = settings.workshopBunnyLibraryId;
  const videoId = settings.workshopBunnyVideoId;
  if (!libraryId || !videoId || !isValidBunnyLibraryId(libraryId) || !isValidBunnyVideoId(videoId)) return null;
  return { libraryId, videoId };
}
