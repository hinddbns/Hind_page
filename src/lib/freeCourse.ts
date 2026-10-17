import { cache } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { db } from "@/lib/supabase/db";
import { getAppUser } from "@/lib/session";
import { isPublishable } from "@/lib/freeCourseRules";
import { getAccessLinkStatus, type AccessLinkStatus } from "@/lib/freeCourseAccess";

export const FREE_COURSE_ID = "main";

export type FreeCourseRow = Tables<"FreeCourse">;

/** Uncached read — for admin actions, which must see the row as it is right now. */
export async function fetchFreeCourse(): Promise<FreeCourseRow | null> {
  const { data, error } = await db.from("FreeCourse").select("*").eq("id", FREE_COURSE_ID).maybeSingle();
  if (error) throw error;
  return data;
}

/** Request-deduplicated read, shared by a page and its generateMetadata. */
export const getFreeCourse = cache(fetchFreeCourse);

/** Why visitors can't currently see what an admin is previewing (null = they can). */
export type FreeCoursePreviewNotice = "draft" | Exclude<AccessLinkStatus, "open"> | null;

/**
 * The single authority on who may see /free-course/{code}. Anonymous visitors get the row only
 * when it's published, complete, `code` is the current group name and its date hasn't passed;
 * anyone else gets `null` → 404, so neither draft text nor an old group's link reveals anything
 * (HTML, metadata or RSC payload). An admin gets the row for any code, flagged as a preview with
 * the reason visitors can't see it. The admin lookup only runs when visitors are refused, so normal
 * visits make no auth call. This uses the service-role client, so this check IS the access
 * control — keep both the page and generateMetadata going through it.
 */
export const getFreeCourseForViewer = cache(
  async (
    code: string
  ): Promise<{ course: FreeCourseRow; preview: boolean; notice: FreeCoursePreviewNotice } | null> => {
    const course = await getFreeCourse();
    if (!course) return null;
    const access = getAccessLinkStatus(course, code, new Date());
    const live = course.published && isPublishable(course);
    if (live && access === "open") return { course, preview: false, notice: null };

    const user = await getAppUser();
    if (user?.role !== "ADMIN") return null;
    return { course, preview: true, notice: !live ? "draft" : access === "open" ? null : access };
  }
);
