import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/siteUrl";

/** A full link the admin can paste into WhatsApp: SITE_URL when set, else the request's own host. */
export async function absoluteUrl(path: string) {
  const siteUrl = getSiteUrl();
  if (siteUrl) return new URL(path, siteUrl).href;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return path;
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}
