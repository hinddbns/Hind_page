import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/db";
import { requireVerifiedSession } from "@/lib/authGuard";

export async function POST(req: Request) {
  const { session, response } = await requireVerifiedSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const courseId = typeof body?.courseId === "string" ? body.courseId : "";
  const answers = Array.isArray(body?.answers) ? body.answers : [];

  if (!courseId || answers.length === 0) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data: enrollment, error: enrollmentError } = await db
    .from("Enrollment")
    .select("status")
    .eq("userId", session.user.id)
    .eq("courseId", courseId)
    .maybeSingle();
  if (enrollmentError) throw enrollmentError;
  if (enrollment?.status !== "APPROVED") {
    return NextResponse.json({ error: "not_approved" }, { status: 403 });
  }

  const { data: questions, error: questionsError } = await db.from("Question").select("id").eq("courseId", courseId);
  if (questionsError) throw questionsError;
  const questionIds = new Set(questions.map((q) => q.id));

  for (const answer of answers) {
    const questionId = typeof answer?.questionId === "string" ? answer.questionId : "";
    if (!questionId || !questionIds.has(questionId)) continue;

    const textValue = typeof answer.textValue === "string" ? answer.textValue.trim().slice(0, 5000) : null;
    const scaleValue = typeof answer.scaleValue === "number" ? answer.scaleValue : null;
    const selectedOptionIds = Array.isArray(answer.selectedOptionIds)
      ? JSON.stringify(answer.selectedOptionIds.filter((v: unknown) => typeof v === "string"))
      : null;

    // Not a plain .upsert(): Supabase's upsert applies the whole payload on conflict too, which
    // would overwrite an existing row's `id` on every update. Replicating Prisma's exact
    // update-or-create split (never touching `id` on the update path) explicitly instead.
    const { data: updated, error: updateError } = await db
      .from("QuestionAnswer")
      .update({ textValue, scaleValue, selectedOptionIds, courseId })
      .eq("questionId", questionId)
      .eq("userId", session.user.id)
      .select("id");
    if (updateError) throw updateError;

    if (!updated || updated.length === 0) {
      const { error: insertError } = await db.from("QuestionAnswer").insert({
        id: randomUUID(),
        questionId,
        userId: session.user.id,
        courseId,
        textValue,
        scaleValue,
        selectedOptionIds,
      });
      if (insertError) throw insertError;
    }
  }

  return NextResponse.json({ ok: true });
}
