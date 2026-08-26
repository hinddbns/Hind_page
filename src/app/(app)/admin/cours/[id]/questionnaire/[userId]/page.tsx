import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase/db";
import { getT } from "@/i18n/server";

export default async function AdminQuestionnaireResponsesPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = await params;
  const { t } = await getT();

  const [courseResult, userResult] = await Promise.all([
    db
      .from("Course")
      .select("*, questions:Question(*, options:QuestionOption(*))")
      .eq("id", id)
      .order("order", { referencedTable: "questions", ascending: true })
      .maybeSingle(),
    db.from("User").select("*").eq("id", userId).maybeSingle(),
  ]);
  if (courseResult.error) throw courseResult.error;
  if (userResult.error) throw userResult.error;
  const course = courseResult.data;
  const user = userResult.data;
  if (!course || !user) notFound();

  const { data: answers, error: answersError } = await db
    .from("QuestionAnswer")
    .select("*")
    .eq("userId", userId)
    .eq("courseId", id);
  if (answersError) throw answersError;
  const answersByQuestion = new Map(answers.map((a) => [a.questionId, a]));

  return (
    <div>
      <Link
        href={`/admin/cours/${course.id}/questionnaire`}
        className="text-sm font-medium text-primary hover:underline"
      >
        {t.admin.backToCourses}
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-ink">
        {t.admin.responsesFor} — {user.name}
      </h1>
      <p className="text-sm text-ink-soft">{course.title}</p>

      {answers.length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">{t.admin.noResponsesYet}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {course.questions.map((q) => {
            const answer = answersByQuestion.get(q.id);

            let answerDisplay: string;
            if (!answer) {
              answerDisplay = "—";
            } else if (q.type === "OPEN") {
              answerDisplay = answer.textValue || "—";
            } else if (q.type === "SCALE") {
              answerDisplay = answer.scaleValue != null ? String(answer.scaleValue) : "—";
            } else {
              const selectedIds: string[] = answer.selectedOptionIds
                ? JSON.parse(answer.selectedOptionIds)
                : [];
              const labels = q.options.filter((o) => selectedIds.includes(o.id)).map((o) => o.label);
              answerDisplay = labels.length ? labels.join(", ") : "—";
            }

            return (
              <div key={q.id} className="rounded-2xl border border-primary-light/50 bg-white p-5">
                <p className="text-sm font-medium text-ink">{q.text}</p>
                <p className="mt-2 text-sm text-ink-soft">{answerDisplay}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
