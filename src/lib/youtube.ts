// Pure helpers for YouTube video references on the free course — no network calls, safe to import
// from tests. Mirrors src/lib/bunny.ts: only the validated 11-character video ID is persisted, and
// the iframe URL is always rebuilt from a fixed host, so a stored value can never smuggle in an
// arbitrary iframe source.

export type ParsedYouTubeReference = { ok: true; videoId: string } | { ok: false };

// youtube-nocookie.com is YouTube's privacy-enhanced embed host: no tracking cookies until play.
const EMBED_HOST = "www.youtube-nocookie.com";
/** The IFrame Player API must be pointed at the embed's own host, or its handshake never lands. */
export const YOUTUBE_EMBED_ORIGIN = `https://${EMBED_HOST}`;
const WATCH_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);
const EMBED_HOSTS = new Set(["youtube-nocookie.com", "www.youtube-nocookie.com", ...WATCH_HOSTS]);
const SHORT_HOST = "youtu.be";
const MAX_INPUT_LENGTH = 2000;

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PATH_PATTERN = /^\/(?:embed|shorts|live|v)\/([^/]+)\/?$/;
const IFRAME_SRC_PATTERN = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

export function isValidYouTubeVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value);
}

/**
 * Recognizes a YouTube watch/share/shorts/live/embed URL or an embed `<iframe>` snippet. Returns
 * `null` when the input isn't a YouTube reference at all (so the caller can try Bunny instead),
 * and `{ ok: false }` when it is one but carries no valid video ID. Query parameters other than
 * `v` (playlists, start times, tracking) are ignored, never persisted.
 */
export function parseYouTubeReference(input: string): ParsedYouTubeReference | null {
  let reference = input.trim();
  if (!reference || reference.length > MAX_INPUT_LENGTH) return null;

  if (/^<iframe[\s>]/i.test(reference)) {
    const match = IFRAME_SRC_PATTERN.exec(reference);
    const src = match?.[1] ?? match?.[2];
    if (!src) return null;
    reference = src.trim();
  }

  // Links copied from the share sheet often drop the scheme ("youtu.be/…", "www.youtube.com/…").
  if (/^(?:www\.|m\.|music\.)?(?:youtube(?:-nocookie)?\.com|youtu\.be)\//i.test(reference)) {
    reference = `https://${reference}`;
  }

  let url: URL;
  try {
    url = new URL(reference);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== SHORT_HOST && !EMBED_HOSTS.has(host)) return null;
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false };
  if (url.username !== "" || url.password !== "" || url.port !== "") return { ok: false };

  let candidate: string | null = null;
  if (host === SHORT_HOST) {
    candidate = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null;
  } else if (WATCH_HOSTS.has(host) && url.pathname === "/watch") {
    candidate = url.searchParams.get("v");
  } else {
    candidate = PATH_PATTERN.exec(url.pathname)?.[1] ?? null;
  }

  return candidate !== null && isValidYouTubeVideoId(candidate) ? { ok: true, videoId: candidate } : { ok: false };
}

/** The canonical watch URL — what the admin form shows for a saved YouTube video. */
export function buildYouTubeWatchUrl(videoId: string): string {
  if (!isValidYouTubeVideoId(videoId)) throw new Error("Invalid YouTube video ID.");
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Builds the privacy-enhanced embed URL. Throws on invalid input — callers pass a stored,
 * already-validated ID, so a throw here means corrupted data, not user error. `jsApiOrigin`
 * (the page's own origin) enables the IFrame Player API the seek guard needs; `disablekb` turns
 * off YouTube's arrow-key jumps in that mode so the guard isn't constantly snapping back.
 */
export function buildYouTubeEmbedUrl(videoId: string, { jsApiOrigin }: { jsApiOrigin?: string } = {}): string {
  if (!isValidYouTubeVideoId(videoId)) throw new Error("Invalid YouTube video ID.");
  const url = new URL(`https://${EMBED_HOST}/embed/${videoId}`);
  url.searchParams.set("rel", "0");
  url.searchParams.set("playsinline", "1");
  if (jsApiOrigin) {
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("origin", jsApiOrigin);
    url.searchParams.set("disablekb", "1");
  }
  return url.toString();
}
