import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";

export default async function AdminQuestionnaireResponsesPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = await params;
  const { t } = await getT();

  const [course, user] = await Promise.all([
    prisma.course.findUnique({
      where: { id },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  if (!course || !user) notFound();

  const answers = await prisma.questionAnswer.findMany({
    where: { userId, courseId: id },
  });
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
