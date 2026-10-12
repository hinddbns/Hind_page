// Pure helpers for Bunny Stream video references — no network calls, no credentials, safe to
// import from tests. Only validated identifiers are ever persisted; the iframe URL is always
// rebuilt from a fixed host, so a stored value can never smuggle in an arbitrary iframe source.
//
// Public-library playback only: this module deliberately knows nothing about token signing,
// which belongs to the future protected lesson-video migration (see docs/ROADMAP.md).

export type BunnyVideoRef = { libraryId: string; videoId: string };

export type BunnyReferenceError =
  | "missing_library_id"
  | "invalid_library_id"
  | "invalid_video_id"
  | "unsupported_url"
  | "library_id_mismatch";

export type ParsedBunnyReference =
  | { ok: true; libraryId: string | null; videoId: string | null }
  | { ok: false; error: BunnyReferenceError };

// Both player hosts Bunny has published embed/play links under; output always uses the first.
const ACCEPTED_HOSTS = new Set(["iframe.mediadelivery.net", "player.mediadelivery.net"]);
const EMBED_HOST = "iframe.mediadelivery.net";
const MAX_INPUT_LENGTH = 2000;

const LIBRARY_ID_PATTERN = /^[1-9][0-9]{0,9}$/;
const VIDEO_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const URL_PATH_PATTERN = /^\/(?:embed|play)\/([^/]+)\/([^/]+)\/?$/;
const IFRAME_SRC_PATTERN = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

export function isValidBunnyLibraryId(value: string): boolean {
  return LIBRARY_ID_PATTERN.test(value);
}

export function isValidBunnyVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value);
}

/**
 * Accepts a bare video GUID (with `libraryIdInput`), a Bunny embed/play URL, or the `<iframe>`
 * snippet Bunny's dashboard offers. An empty reference is valid (a draft without a video yet).
 * Query strings and fragments on pasted URLs are ignored, never persisted.
 */
export function parseBunnyReference(referenceInput: string, libraryIdInput = ""): ParsedBunnyReference {
  let reference = referenceInput.trim();
  const libraryField = libraryIdInput.trim();

  if (libraryField && !isValidBunnyLibraryId(libraryField)) {
    return { ok: false, error: "invalid_library_id" };
  }

  if (!reference) {
    return { ok: true, libraryId: libraryField || null, videoId: null };
  }

  if (reference.length > MAX_INPUT_LENGTH) {
    return { ok: false, error: "unsupported_url" };
  }

  if (/^<iframe[\s>]/i.test(reference)) {
    const match = IFRAME_SRC_PATTERN.exec(reference);
    const src = match?.[1] ?? match?.[2];
    if (!src) return { ok: false, error: "unsupported_url" };
    reference = src.trim();
  }

  const lowered = reference.toLowerCase();
  if (isValidBunnyVideoId(lowered)) {
    if (!libraryField) return { ok: false, error: "missing_library_id" };
    return { ok: true, libraryId: libraryField, videoId: lowered };
  }

  let url: URL;
  try {
    url = new URL(reference);
  } catch {
    // Not a URL: if it looks like an attempted GUID, say so specifically.
    return { ok: false, error: /^[0-9a-f-]{20,}$/i.test(reference) ? "invalid_video_id" : "unsupported_url" };
  }

  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    !ACCEPTED_HOSTS.has(url.hostname)
  ) {
    return { ok: false, error: "unsupported_url" };
  }

  const pathMatch = URL_PATH_PATTERN.exec(url.pathname);
  if (!pathMatch) return { ok: false, error: "unsupported_url" };

  const [, urlLibraryId, rawVideoId] = pathMatch;
  if (!isValidBunnyLibraryId(urlLibraryId)) return { ok: false, error: "invalid_library_id" };
  const videoId = rawVideoId.toLowerCase();
  if (!isValidBunnyVideoId(videoId)) return { ok: false, error: "invalid_video_id" };
  if (libraryField && libraryField !== urlLibraryId) return { ok: false, error: "library_id_mismatch" };

  return { ok: true, libraryId: urlLibraryId, videoId };
}

/** Builds the public (unsigned) embed URL. Throws on invalid input — callers pass stored,
 * already-validated identifiers, so a throw here means corrupted data, not user error.
 * `restrictSeeking` turns off Bunny's resume-from-last-position so a reload can't start the
 * viewer beyond what the seek guard allows. */
export function buildBunnyEmbedUrl(
  { libraryId, videoId }: BunnyVideoRef,
  { restrictSeeking = false }: { restrictSeeking?: boolean } = {}
): string {
  if (!isValidBunnyLibraryId(libraryId) || !isValidBunnyVideoId(videoId)) {
    throw new Error("Invalid Bunny Stream identifiers.");
  }
  const url = new URL(`https://${EMBED_HOST}/embed/${libraryId}/${videoId}`);
  url.searchParams.set("autoplay", "false");
  url.searchParams.set("loop", "false");
  url.searchParams.set("muted", "false");
  url.searchParams.set("preload", "true");
  url.searchParams.set("responsive", "true");
  if (restrictSeeking) url.searchParams.set("rememberPosition", "false");
  return url.toString();
}
