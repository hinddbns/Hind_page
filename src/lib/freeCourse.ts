import { cache } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { db } from "@/lib/supabase/db";
import { getAppUser } from "@/lib/session";
import { resolveFreeCourseView, type FreeCourseView } from "@/lib/freeCourseRules";
import { isValidAccessCode, normalizeAccessCode } from "@/lib/freeCourseAccess";

export type FreeCourseRow = Tables<"FreeCourse">;

/** Uncached read by id — for admin pages and actions, which must see the row as it is right now. */
export async function fetchFreeCourse(id: string): Promise<FreeCourseRow | null> {
  const { data, error } = await db.from("FreeCourse").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Every free course page, oldest first, for the admin list. */
export async function listFreeCourses(): Promise<FreeCourseRow[]> {
  const { data, error } = await db
    .from("FreeCourse")
    .select("*")
    .order("createdAt", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return data;
}

/** The page whose access code is `code`, or null. A malformed code never reaches the database. */
async function fetchFreeCourseByCode(code: string): Promise<FreeCourseRow | null> {
  const normalized = normalizeAccessCode(code);
  if (!isValidAccessCode(normalized)) return null;
  const { data, error } = await db.from("FreeCourse").select("*").eq("accessCode", normalized).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * The single authority on who may see /course/{code}, shared by the page and its
 * generateMetadata so neither draft text nor an old link reveals anything (HTML, metadata or RSC
 * payload). Pages are found by access code only, never by id. The admin lookup only runs when a
 * visitor would be refused, so normal visits make no auth call. This uses the service-role
 * client, so this check IS the access control — keep both callers going through it.
 */
export const getFreeCourseForViewer = cache(async (code: string): Promise<FreeCourseView<FreeCourseRow> | null> => {
  const course = await fetchFreeCourseByCode(code);
  if (!course) return null;
  const now = new Date();
  const visitorView = resolveFreeCourseView(course, code, false, now);
  if (visitorView) return visitorView;

  const user = await getAppUser();
  return resolveFreeCourseView(course, code, user?.role === "ADMIN", now);
});
