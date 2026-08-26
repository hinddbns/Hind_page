-- Batch 5 of the Prisma -> Supabase migration: atomic nested-write RPCs for the three
-- admin/actions.ts mutations that relied on Prisma's implicit-transaction behavior for a single
-- top-level `create`/`update` call with a nested `{ create: [...] }` relation write (Question +
-- QuestionOption, and SocialLink + SocialLinkAssignment). PostgREST/supabase-js has no equivalent
-- to a single-request multi-table transaction, so a naive parent-insert-then-children-insert
-- translation would leave an orphaned parent row on a real database/network failure — SECURITY
-- DEFINER PL/pgSQL functions restore the same all-or-nothing guarantee Prisma provided, matching
-- the existing delete_course_if_no_enrollments precedent (20260826120000/20260826120100).
--
-- update_question_with_options additionally folds in the QuestionOption delete step that the
-- Prisma-era updateQuestion action performed as a *separate*, non-transactional
-- `questionOption.deleteMany()` call before its `question.update()` — the two were never atomic
-- with each other even under Prisma. Making the full delete+update+insert sequence one
-- transaction here is a strict improvement (a failure now leaves the original question/options
-- untouched instead of a partially-updated question with zero options) and does not change any
-- successful-path behavior.
--
-- None of these functions perform authorization themselves — callers (server-side, service-role
-- only) must call requireAdmin() first, exactly as every other admin action already does. EXECUTE
-- is restricted to service_role for the same reason as delete_course_if_no_enrollments: these
-- must not be reachable through PostgREST's public RPC surface by anon/authenticated callers.
CREATE OR REPLACE FUNCTION public.create_question_with_options(
  p_course_id TEXT,
  p_type TEXT,
  p_text TEXT,
  p_order INTEGER,
  p_scale_min INTEGER,
  p_scale_max INTEGER,
  p_scale_min_label TEXT,
  p_scale_max_label TEXT,
  p_options JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id TEXT := gen_random_uuid()::text;
  v_option JSONB;
BEGIN
  INSERT INTO "Question" ("id", "courseId", "type", "text", "order", "scaleMin", "scaleMax", "scaleMinLabel", "scaleMaxLabel")
  VALUES (v_question_id, p_course_id, p_type::"QuestionType", p_text, p_order, p_scale_min, p_scale_max, p_scale_min_label, p_scale_max_label);

  FOR v_option IN SELECT * FROM jsonb_array_elements(p_options)
  LOOP
    INSERT INTO "QuestionOption" ("id", "questionId", "label", "order")
    VALUES (gen_random_uuid()::text, v_question_id, v_option->>'label', (v_option->>'order')::integer);
  END LOOP;

  RETURN v_question_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_question_with_options(
  p_question_id TEXT,
  p_type TEXT,
  p_text TEXT,
  p_order INTEGER,
  p_scale_min INTEGER,
  p_scale_max INTEGER,
  p_scale_min_label TEXT,
  p_scale_max_label TEXT,
  p_options JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_option JSONB;
BEGIN
  DELETE FROM "QuestionOption" WHERE "questionId" = p_question_id;

  UPDATE "Question"
  SET "type" = p_type::"QuestionType",
      "text" = p_text,
      "order" = p_order,
      "scaleMin" = p_scale_min,
      "scaleMax" = p_scale_max,
      "scaleMinLabel" = p_scale_min_label,
      "scaleMaxLabel" = p_scale_max_label
  WHERE "id" = p_question_id;

  FOR v_option IN SELECT * FROM jsonb_array_elements(p_options)
  LOOP
    INSERT INTO "QuestionOption" ("id", "questionId", "label", "order")
    VALUES (gen_random_uuid()::text, p_question_id, v_option->>'label', (v_option->>'order')::integer);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_social_link_with_assignments(
  p_platform TEXT,
  p_url TEXT,
  p_surfaces TEXT[]
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id TEXT := gen_random_uuid()::text;
  v_surface TEXT;
BEGIN
  INSERT INTO "SocialLink" ("id", "platform", "url")
  VALUES (v_link_id, p_platform::"SocialPlatform", p_url);

  FOREACH v_surface IN ARRAY p_surfaces
  LOOP
    INSERT INTO "SocialLinkAssignment" ("id", "linkId", "platform", "surface")
    VALUES (gen_random_uuid()::text, v_link_id, p_platform::"SocialPlatform", v_surface::"SocialSurface");
  END LOOP;

  RETURN v_link_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_question_with_options(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_question_with_options(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_question_with_options(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_question_with_options(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_question_with_options(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_question_with_options(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_question_with_options(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_question_with_options(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_social_link_with_assignments(TEXT, TEXT, TEXT[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_social_link_with_assignments(TEXT, TEXT, TEXT[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_social_link_with_assignments(TEXT, TEXT, TEXT[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_social_link_with_assignments(TEXT, TEXT, TEXT[]) TO service_role;
