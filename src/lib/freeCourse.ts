import { cache } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { db } from "@/lib/supabase/db";
import { getAppUser } from "@/lib/session";
import { isPublishable } from "@/lib/freeCourseRules";

export const FREE_COURSE_ID = "main";
export const FREE_COURSE_PATH = "/cours-gratuit";

export type FreeCourseRow = Tables<"FreeCourse">;

/** Uncached read — for admin actions, which must see the row as it is right now. */
export async function fetchFreeCourse(): Promise<FreeCourseRow | null> {
  const { data, error } = await db.from("FreeCourse").select("*").eq("id", FREE_COURSE_ID).maybeSingle();
  if (error) throw error;
  return data;
}

/** Request-deduplicated read, shared by a page and its generateMetadata. */
export const getFreeCourse = cache(fetchFreeCourse);

/**
 * The single authority on who may see the free course page. Anonymous visitors get the row only
 * when it's published (and still complete); anyone else gets `null` → 404, so no draft text can
 * reach HTML, metadata or the RSC payload. An admin additionally gets an unpublished row, flagged
 * as a preview. The admin lookup only runs on the draft path, so normal published visits make no
 * auth call. This uses the service-role client, so this check IS the access control — keep both
 * the page and generateMetadata going through it.
 */
export const getFreeCourseForViewer = cache(
  async (): Promise<{ course: FreeCourseRow; preview: boolean } | null> => {
    const course = await getFreeCourse();
    if (!course) return null;
    if (course.published && isPublishable(course)) return { course, preview: false };

    const user = await getAppUser();
    if (user?.role === "ADMIN") return { course, preview: true };
    return null;
  }
);
