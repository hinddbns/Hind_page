import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (enrollment?.status !== "APPROVED") {
    return NextResponse.json({ error: "not_approved" }, { status: 403 });
  }

  const questions = await prisma.question.findMany({ where: { courseId } });
  const questionIds = new Set(questions.map((q) => q.id));

  for (const answer of answers) {
    const questionId = typeof answer?.questionId === "string" ? answer.questionId : "";
    if (!questionId || !questionIds.has(questionId)) continue;

    const textValue = typeof answer.textValue === "string" ? answer.textValue.trim().slice(0, 5000) : null;
    const scaleValue = typeof answer.scaleValue === "number" ? answer.scaleValue : null;
    const selectedOptionIds = Array.isArray(answer.selectedOptionIds)
      ? JSON.stringify(answer.selectedOptionIds.filter((v: unknown) => typeof v === "string"))
      : null;

    await prisma.questionAnswer.upsert({
      where: { questionId_userId: { questionId, userId: session.user.id } },
      update: { textValue, scaleValue, selectedOptionIds, courseId },
      create: {
        questionId,
        userId: session.user.id,
        courseId,
        textValue,
        scaleValue,
        selectedOptionIds,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
