import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import QuestionForm from "@/components/QuestionForm";
import ConfirmActionForm from "@/components/admin/ConfirmActionForm";
import { createQuestion, deleteQuestion, toggleQuestionnaire, updateQuestion } from "../../../actions";

const TYPE_LABEL_KEY = {
  OPEN: "typeOpen",
  SINGLE_CHOICE: "typeSingle",
  MULTIPLE_CHOICE: "typeMultiple",
  SCALE: "typeScale",
} as const;

export default async function AdminQuestionnairePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { t } = await getT();

  const course = await prisma.course.findUnique({
    where: { id },
    include: { questions: { include: { options: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
  });
  if (!course) notFound();

  return (
    <div>
      <Link href={`/admin/cours/${course.id}`} className="text-sm font-medium text-primary hover:underline">
        {t.admin.backToCourses}
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-ink">{course.title}</h1>
      <h2 className="mt-1 font-serif text-xl text-ink-soft">{t.admin.questionnaireTitle}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">{t.admin.questionnaireSubtitle}</p>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-primary-light/50 bg-white p-6">
        <div>
          <p className="font-medium text-ink">{t.admin.questionnaireToggleLabel}</p>
          <p className="mt-1 text-xs text-ink-soft">{t.admin.questionnaireEnabledHint}</p>
        </div>
        <ConfirmActionForm
          action={toggleQuestionnaire.bind(null, course.id, !course.questionnaireEnabled)}
          label={course.questionnaireEnabled ? t.admin.questionnaireOn : t.admin.questionnaireOff}
          pendingLabel={t.admin.saving}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            course.questionnaireEnabled
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        />
      </div>

      {!course.questionnaireEnabled && course.questions.length > 0 && (
        <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {t.admin.questionnaireDisabledWarning}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {course.questions.map((q) => (
          <div key={q.id} className="rounded-2xl border border-primary-light/50 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-dark">
                  {t.admin[TYPE_LABEL_KEY[q.type]]}
                </span>
                <p className="mt-2 font-medium text-ink">
                  {q.order}. {q.text}
                </p>
                {q.options.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className="rounded-full border border-primary-light/50 bg-cream-dark/40 px-3 py-1 text-xs text-ink-soft"
                      >
                        {o.label}
                      </li>
                    ))}
                  </ul>
                )}
                {q.type === "SCALE" && (
                  <p className="mt-2 text-xs text-ink-soft">
                    {q.scaleMin} {q.scaleMinLabel ? `(${q.scaleMinLabel})` : ""} → {q.scaleMax}{" "}
                    {q.scaleMaxLabel ? `(${q.scaleMaxLabel})` : ""}
                  </p>
                )}
              </div>
              <ConfirmActionForm
                action={deleteQuestion.bind(null, q.id, course.id)}
                confirmMessage={t.admin.confirmDeleteQuestion}
                label={t.admin.delete}
                pendingLabel={t.admin.deleting}
                className="shrink-0 rounded-full border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
              />
            </div>

            <QuestionForm
              action={updateQuestion.bind(null, q.id, course.id)}
              mode="edit"
              submitLabel={t.admin.editQuestionBtn}
              initialType={q.type}
              initialText={q.text}
              initialOrder={q.order}
              initialOptions={q.options.map((o) => ({ label: o.label }))}
              initialScaleMin={q.scaleMin ?? 1}
              initialScaleMax={q.scaleMax ?? 5}
              initialScaleMinLabel={q.scaleMinLabel ?? ""}
              initialScaleMaxLabel={q.scaleMaxLabel ?? ""}
            />
          </div>
        ))}
        {course.questions.length === 0 && <p className="text-sm text-ink-soft">{t.admin.noQuestions}</p>}
      </div>

      <div className="mt-8 rounded-2xl border border-primary-light/50 bg-white p-6">
        <h2 className="font-serif text-lg text-ink">{t.admin.addQuestion}</h2>
        <QuestionForm
          action={createQuestion.bind(null, course.id)}
          mode="add"
          submitLabel={t.admin.addQuestionBtn}
          initialOrder={course.questions.length + 1}
        />
      </div>
    </div>
  );
}
