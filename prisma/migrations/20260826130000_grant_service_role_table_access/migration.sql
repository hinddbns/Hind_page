-- Phase 2A of the Prisma -> Supabase migration: standing data-privilege grants for service_role.
--
-- Audited before writing this migration (not assumed): all 14 application tables have RLS
-- enabled with zero policies (Supabase's baseline — pg_tables.rowsecurity = true everywhere,
-- pg_policies has no rows for any of them), and `anon`/`authenticated` currently hold only the
-- default REFERENCES/TRIGGER/TRUNCATE privileges on every table — no SELECT/INSERT/UPDATE/DELETE
-- anywhere. `service_role` held the exact same bare-minimum default, which is why the Phase 1
-- RPC test failed under SECURITY INVOKER ("permission denied for table Course").
--
-- service_role has rolbypassrls = true (confirmed via pg_roles), so it is not subject to RLS at
-- all — the missing piece was purely the standing table grants below, not RLS policies. This
-- migration does not enable, disable, or add any RLS policy; RLS's existing default-deny posture
-- for anon/authenticated is untouched and continues to block them exactly as it does today.
--
-- Grants below are scoped to exactly what the current 118 Prisma call sites actually do per
-- table (see the Phase 2A audit) — no table gets a write privilege it has no existing call site
-- for. Course intentionally does NOT get DELETE: the one existing course-delete call site
-- (admin/actions.ts's deleteCourse) is being replaced by the SECURITY DEFINER RPC
-- (delete_course_if_no_enrollments, added in 20260826120000/20260826120100) specifically to
-- preserve its atomic race-guard — a standing service_role DELETE grant on "Course" would offer a
-- second, non-atomic path around that guard.
GRANT SELECT, INSERT, UPDATE ON TABLE "User" TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE "Course" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Question" TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE "QuestionOption" TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE "QuestionAnswer" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Lesson" TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE "LessonProgress" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Enrollment" TO service_role;
GRANT SELECT, INSERT ON TABLE "Message" TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE "Settings" TO service_role;
GRANT SELECT, INSERT ON TABLE "AuditLog" TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE "SocialLink" TO service_role;
GRANT SELECT, INSERT ON TABLE "SocialLinkAssignment" TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE "RateLimitHit" TO service_role;

-- Deliberately absent from this migration, by design:
--   - No GRANT to PUBLIC, anon, or authenticated on any application table.
--   - No ALTER ... ENABLE/DISABLE ROW LEVEL SECURITY anywhere.
--   - No CREATE POLICY anywhere.
--   - No DELETE grant on "Course" (see above).
--   - No table ownership change (all 14 tables remain owned by `postgres`, unchanged).
