import { db } from "@/lib/supabase/db";
import type { Enums } from "@/lib/supabase/database.types";

type SocialPlatform = Enums<"SocialPlatform">;
type SocialSurface = Enums<"SocialSurface">;

export type SocialVariant = "global" | "parents" | "ados";
export type SocialPlatformKey = "instagram" | "facebook" | "youtube" | "tiktok" | "whatsapp";
export type SocialLinksMap = Partial<Record<SocialPlatformKey, string>>;

export const SURFACE_TO_VARIANT: Record<SocialSurface, SocialVariant> = {
  GLOBAL: "global",
  PARENTS: "parents",
  ADOLESCENTS: "ados",
};

export const PLATFORM_TO_KEY: Record<SocialPlatform, SocialPlatformKey> = {
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
  YOUTUBE: "youtube",
  TIKTOK: "tiktok",
  WHATSAPP: "whatsapp",
};

/** Every public/app surface's social links, keyed by the same lowercase
 * variant names the layout components already use for workspace selection. */
export async function getSocialLinksByVariant(): Promise<Record<SocialVariant, SocialLinksMap>> {
  const { data: assignments, error } = await db.from("SocialLinkAssignment").select("*, link:SocialLink(*)");
  if (error) throw error;
  const result: Record<SocialVariant, SocialLinksMap> = { global: {}, parents: {}, ados: {} };
  for (const assignment of assignments) {
    result[SURFACE_TO_VARIANT[assignment.surface]][PLATFORM_TO_KEY[assignment.platform]] = assignment.link.url;
  }
  return result;
}
