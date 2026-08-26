-- Testing the previous migration's function (20260826120000_add_delete_course_rpc) revealed
-- that `service_role` has no standing table-level SELECT/DELETE grants on "Course"/"Enrollment"
-- — tables created via raw Prisma-driven SQL migrations never received the default-privilege
-- grants Supabase's own tooling normally applies automatically when a table is created through
-- it. Under SECURITY INVOKER, the function therefore failed with "permission denied for table
-- Course" when called by the service-role connection.
--
-- Switching to SECURITY DEFINER is the narrower fix: the function now runs with its owner's
-- privileges (the migration connection, which already has full table access — the same one
-- Prisma already uses) instead of the caller's. This avoids granting service_role any new
-- standing table-level access outside this one function; the EXECUTE-level restriction (only
-- service_role may call it at all — never anon/authenticated/public) stays exactly as before, and
-- the function's body is unchanged: fixed, narrow, non-parameterized-SQL logic, not an
-- arbitrary-query surface, so DEFINER does not broaden what the function can be made to do.
CREATE OR REPLACE FUNCTION public.delete_course_if_no_enrollments(p_course_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grants are idempotent — re-stating them here keeps this migration self-contained and correct
-- even if it were ever re-run against a fresh database on its own.
REVOKE EXECUTE ON FUNCTION public.delete_course_if_no_enrollments(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_course_if_no_enrollments(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_course_if_no_enrollments(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_course_if_no_enrollments(TEXT) TO service_role;
