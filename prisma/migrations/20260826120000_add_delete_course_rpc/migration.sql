-- Atomically deletes a course only if it currently has zero enrollments — preserves the
-- race-safety of the application-level guard already used by the Prisma-era deleteCourse
-- action (see admin/actions.ts): a single statement means a brand-new enrollment created
-- between "check" and "delete" can't be silently wiped out by a race, because there is no
-- separate "check" step for a race to land in. The existing FK CASCADE on Lesson/Question/
-- LessonProgress -> Course is untouched by this migration and still applies exactly as before
-- when the delete succeeds.
--
-- This function does NOT perform any authorization check itself — callers (server-side,
-- service-role only) must verify the caller is an admin before invoking it, exactly as the
-- existing requireAdmin() check already does for the Prisma-based action. Execute privileges
-- are intentionally restricted below so this can't be reached through PostgREST's public RPC
-- surface by a regular authenticated or anonymous user; only the service-role connection this
-- app already uses server-side can call it.
CREATE OR REPLACE FUNCTION public.delete_course_if_no_enrollments(p_course_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM "Course"
  WHERE "id" = p_course_id
    AND NOT EXISTS (
      SELECT 1 FROM "Enrollment" WHERE "Enrollment"."courseId" = p_course_id
    );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_course_if_no_enrollments(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_course_if_no_enrollments(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_course_if_no_enrollments(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_course_if_no_enrollments(TEXT) TO service_role;
