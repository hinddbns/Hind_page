/** The public origin from the non-secret `SITE_URL` env var (e.g. `https://example.com`), or
 * `null` when it's unset or malformed. Absolute-URL metadata (canonical, Open Graph `url`) is
 * only emitted when this is available — Next.js fails the build on relative metadata URLs
 * without a `metadataBase`, and guessing a domain would publish a wrong canonical. */
export function getSiteUrl(): URL | null {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}
