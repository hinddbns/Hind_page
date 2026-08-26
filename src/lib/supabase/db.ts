import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-only, service-role Supabase client for querying application data tables directly
// (Course, Enrollment, User, etc.). This is the application's data-access layer — it replaced
// the former Prisma client entirely.
//
// This is a SEPARATE client from `@/lib/supabase/client.ts` (browser Auth) and
// `@/lib/supabase/server.ts` (server, user-cookie-scoped Auth) — those two exist only to talk to
// Supabase Auth and must keep doing exactly that. This client uses the service-role key, the same
// security pattern already used by `@/lib/receiptStorage.ts` for the receipts bucket: a
// module-level singleton, never imported by any "use client" file, never re-exported through a
// path a browser bundle could pull in. The `SUPABASE_SERVICE_ROLE_KEY` env var itself has no
// `NEXT_PUBLIC_` prefix, so Next.js never inlines it into client code in the first place — the
// real guarantee here is the same one `receiptStorage.ts` already relies on: this module is only
// ever imported from Server Components, Server Actions, and Route Handlers.
//
// Because this client bypasses RLS entirely (service-role), every call site that uses it MUST
// keep doing its own application-level authorization check first (`getAppUser()`/`requireAdmin()`/
// `requireVerifiedSession()`) — this client does not add or remove any authorization boundary
// on its own.
export const db = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

/**
 * Every `DateTime` column in this schema is Postgres `timestamp without time zone`
 * (see `prisma/migrations/*`), and PostgREST serializes those with no zone marker
 * (`"2026-08-25T18:33:43.797"`). `new Date()` would parse that in the server's
 * local zone, whereas Prisma always read these columns back as UTC — so append a
 * `Z` when none is present to keep the instant identical regardless of host TZ.
 */
export function pgTimestampToDate(ts: string): Date {
  return new Date(/(?:Z|[+-]\d\d:?\d\d)$/.test(ts) ? ts : `${ts}Z`);
}

/**
 * Atomically deletes a course only if it currently has zero enrollments, preserving the exact
 * race-safety of the Prisma-era `deleteCourse` action (see `admin/actions.ts`): the check and the
 * delete happen as one statement inside the Postgres function `delete_course_if_no_enrollments`
 * (see `prisma/migrations/20260826120000_add_delete_course_rpc/migration.sql`), so a brand-new
 * enrollment created between "check" and "delete" can't be silently wiped out by a race.
 */
export async function deleteCourseIfNoEnrollments(courseId: string): Promise<{ deleted: boolean }> {
  const { data, error } = await db.rpc("delete_course_if_no_enrollments", { p_course_id: courseId });
  if (error) throw error;
  return { deleted: data === true };
}

type QuestionOptionInput = { label: string; order: number };

type QuestionFields = {
  type: string;
  text: string;
  order: number;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
};

/**
 * Inserts a Question and its QuestionOptions atomically, via `create_question_with_options`
 * (see `prisma/migrations/20260826140000_add_question_and_social_link_rpcs/migration.sql`) —
 * PostgREST has no multi-table transaction, so a plain insert-then-insert here could leave an
 * orphaned Question row with no options on a mid-request failure, unlike Prisma's nested
 * `question.create({ data: { options: { create: [...] } } })`, which was atomic. Returns the new
 * question's id.
 */
export async function createQuestionWithOptions(
  courseId: string,
  fields: QuestionFields,
  options: QuestionOptionInput[]
): Promise<string> {
  const { data, error } = await db.rpc("create_question_with_options", {
    p_course_id: courseId,
    p_type: fields.type,
    p_text: fields.text,
    p_order: fields.order,
    p_scale_min: fields.scaleMin,
    p_scale_max: fields.scaleMax,
    p_scale_min_label: fields.scaleMinLabel,
    p_scale_max_label: fields.scaleMaxLabel,
    p_options: options,
  });
  if (error) throw error;
  return data;
}

/**
 * Replaces a Question's fields and QuestionOptions atomically, via
 * `update_question_with_options` — folds what used to be two separate, non-transactional Prisma
 * calls (`questionOption.deleteMany()` then `question.update()` with a nested options create)
 * into one transaction, so a mid-request failure leaves the original question/options untouched
 * instead of a question with zero options.
 */
export async function updateQuestionWithOptions(
  questionId: string,
  fields: QuestionFields,
  options: QuestionOptionInput[]
): Promise<void> {
  const { error } = await db.rpc("update_question_with_options", {
    p_question_id: questionId,
    p_type: fields.type,
    p_text: fields.text,
    p_order: fields.order,
    p_scale_min: fields.scaleMin,
    p_scale_max: fields.scaleMax,
    p_scale_min_label: fields.scaleMinLabel,
    p_scale_max_label: fields.scaleMaxLabel,
    p_options: options,
  });
  if (error) throw error;
}

/**
 * Inserts a SocialLink and its SocialLinkAssignments atomically, via
 * `create_social_link_with_assignments` — same orphaned-parent-row concern as
 * `createQuestionWithOptions` above, for Prisma's old nested
 * `socialLink.create({ data: { assignments: { create: [...] } } })`. Returns the new link's id.
 */
export async function createSocialLinkWithAssignments(
  platform: string,
  url: string,
  surfaces: string[]
): Promise<string> {
  const { data, error } = await db.rpc("create_social_link_with_assignments", {
    p_platform: platform,
    p_url: url,
    p_surfaces: surfaces,
  });
  if (error) throw error;
  return data;
}
