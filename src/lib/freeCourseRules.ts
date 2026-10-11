// Pure validation rules for the standalone free course — no database or Next.js imports, so the
// admin action, the public page and the unit tests all share exactly one definition. The SQL
// CHECK constraints in prisma/migrations/20261011120000_add_free_course mirror these limits.
import type { Enums } from "@/lib/supabase/database.types";
import { isValidBunnyLibraryId, isValidBunnyVideoId } from "@/lib/bunny";

export type VideoAspect = Enums<"VideoAspect">;

export const VIDEO_ASPECTS: readonly VideoAspect[] = ["LANDSCAPE", "PORTRAIT", "SQUARE"];

export const FREE_COURSE_LIMITS = {
  title: 120,
  eyebrow: 60,
  introduction: 600,
  hostIntro: 200,
  seoTitle: 70,
  seoDescription: 160,
} as const;

export type FreeCourseContent = {
  title: string;
  eyebrow: string | null;
  introduction: string;
  bunnyLibraryId: string | null;
  bunnyVideoId: string | null;
  videoAspect: VideoAspect;
  showHost: boolean;
  hostIntro: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  indexable: boolean;
};

export type FreeCourseContentProblem =
  | "titleTooLong"
  | "eyebrowTooLong"
  | "introductionTooLong"
  | "hostIntroTooLong"
  | "seoTitleTooLong"
  | "seoDescriptionTooLong"
  | "invalidLibraryId"
  | "invalidVideoId"
  | "invalidVideoAspect";

export type FreeCoursePublishBlocker = "titleRequired" | "introductionRequired" | "videoRequired";

/** Code-point length, matching Postgres `char_length` (a UTF-16 `.length` would over-count emoji). */
export function textLength(value: string): number {
  return Array.from(value).length;
}

export function isVideoAspect(value: string): value is VideoAspect {
  return (VIDEO_ASPECTS as readonly string[]).includes(value);
}

/** Trims every text field and turns empty optional text into `null`. */
export function normalizeFreeCourseContent(input: FreeCourseContent): FreeCourseContent {
  const optional = (value: string | null) => {
    const trimmed = value?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };
  return {
    ...input,
    title: input.title.trim(),
    eyebrow: optional(input.eyebrow),
    introduction: input.introduction.trim(),
    hostIntro: optional(input.hostIntro),
    seoTitle: optional(input.seoTitle),
    seoDescription: optional(input.seoDescription),
  };
}

/** Problems that make content unsavable, even as a draft. */
export function getContentProblems(content: FreeCourseContent): FreeCourseContentProblem[] {
  const problems: FreeCourseContentProblem[] = [];
  const tooLong = (value: string | null, max: number) => value !== null && textLength(value) > max;

  if (tooLong(content.title, FREE_COURSE_LIMITS.title)) problems.push("titleTooLong");
  if (tooLong(content.eyebrow, FREE_COURSE_LIMITS.eyebrow)) problems.push("eyebrowTooLong");
  if (tooLong(content.introduction, FREE_COURSE_LIMITS.introduction)) problems.push("introductionTooLong");
  if (tooLong(content.hostIntro, FREE_COURSE_LIMITS.hostIntro)) problems.push("hostIntroTooLong");
  if (tooLong(content.seoTitle, FREE_COURSE_LIMITS.seoTitle)) problems.push("seoTitleTooLong");
  if (tooLong(content.seoDescription, FREE_COURSE_LIMITS.seoDescription)) problems.push("seoDescriptionTooLong");
  if (content.bunnyLibraryId !== null && !isValidBunnyLibraryId(content.bunnyLibraryId)) {
    problems.push("invalidLibraryId");
  }
  if (content.bunnyVideoId !== null && !isValidBunnyVideoId(content.bunnyVideoId)) {
    problems.push("invalidVideoId");
  }
  if (!isVideoAspect(content.videoAspect)) problems.push("invalidVideoAspect");
  return problems;
}

/** What still prevents publication — empty when the content may go (or stay) live. */
export function getPublishBlockers(content: FreeCourseContent): FreeCoursePublishBlocker[] {
  const blockers: FreeCoursePublishBlocker[] = [];
  if (content.title.trim() === "") blockers.push("titleRequired");
  if (content.introduction.trim() === "") blockers.push("introductionRequired");
  if (
    content.bunnyLibraryId === null ||
    content.bunnyVideoId === null ||
    !isValidBunnyLibraryId(content.bunnyLibraryId) ||
    !isValidBunnyVideoId(content.bunnyVideoId)
  ) {
    blockers.push("videoRequired");
  }
  return blockers;
}

export function isPublishable(content: FreeCourseContent): boolean {
  return getContentProblems(content).length === 0 && getPublishBlockers(content).length === 0;
}

/** Description fallback for metadata: the introduction, cut at a word boundary. */
export function summarize(text: string, max: number = FREE_COURSE_LIMITS.seoDescription): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(flat);
  if (chars.length <= max) return flat;
  const cut = chars.slice(0, max - 1).join("");
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
