import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Lock, PartyPopper, PlayCircle } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import { interpolate } from "@/i18n/config";
import QuestionnaireForm from "@/components/QuestionnaireForm";
import { getStudentCourse, getApprovedEnrollment, getLessonsWithAccess } from "@/lib/lessonAccess";
import type { LessonAccessState } from "@/lib/lessonAccess";

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const { slug } = await params;
  const { t } = await getT();

  const course = await getStudentCourse(slug);
  if (!course) notFound();

  const isAdmin = session.user.role === "ADMIN";
  const enrollment = isAdmin ? null : await getApprovedEnrollment(session.user.id, course.id);

  if (!isAdmin && enrollment?.status !== "APPROVED") {
    redirect(`/cours/${slug}`);
  }

  const needsQuestionnaire = !isAdmin && course.questionnaireEnabled && course.questions.length > 0;

  if (needsQuestionnaire) {
    const existingAnswers = await prisma.questionAnswer.findMany({
      where: { userId: session.user.id, courseId: course.id },
    });

    if (existingAnswers.length < course.questions.length) {
      const answersByQuestion: Record<
        string,
        { textValue?: string; scaleValue?: number; selectedOptionIds?: string[] }
      > = {};
      for (const a of existingAnswers) {
        answersByQuestion[a.questionId] = {
          textValue: a.textValue ?? undefined,
          scaleValue: a.scaleValue ?? undefined,
          selectedOptionIds: a.selectedOptionIds ? JSON.parse(a.selectedOptionIds) : undefined,
        };
      }

      const questionsForForm = course.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        order: q.order,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        scaleMinLabel: q.scaleMinLabel,
        scaleMaxLabel: q.scaleMaxLabel,
      }));

      return (
        <div className="mx-auto max-w-2xl px-6 py-16">
          <h1 className="font-serif text-3xl text-ink">{t.questionnaire.title}</h1>
          <p className="mt-2 text-ink-soft">{t.questionnaire.subtitle}</p>
          <div className="mt-8">
            <QuestionnaireForm
              courseId={course.id}
              questions={questionsForForm}
              initialAnswers={answersByQuestion}
            />
          </div>
        </div>
      );
    }
  }

  const lessonsWithAccess: (typeof course.lessons[number] & { state: LessonAccessState })[] = isAdmin
    ? course.lessons.map((l) => ({ ...l, state: "current" as const }))
    : await getLessonsWithAccess(course.id, session.user.id, course.lessons);

  const totalCount = course.lessons.length;
  const completedCount = lessonsWithAccess.filter((l) => l.state === "completed").length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = totalCount > 0 && completedCount === totalCount;

  const STATE_ICON = { completed: CheckCircle2, current: PlayCircle, locked: Lock } as const;
  const STATE_ICON_CLASS = {
    completed: "text-success",
    current: "text-primary",
    locked: "text-ink-soft/50",
  } as const;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/tableau-de-bord" className="text-sm font-medium text-primary hover:underline">
        {t.lessonContent.backToDashboard}
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-ink">{course.title}</h1>
      <p className="mt-2 text-ink-soft">{course.description}</p>

      {isComplete ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-5 text-success">
          <PartyPopper className="h-6 w-6 shrink-0" aria-hidden />
          <div>
            <p className="font-serif text-lg">{t.lessonContent.courseCompletedTitle}</p>
            <p className="text-sm">{interpolate(t.lessonContent.percentComplete, { percent: "100" })}</p>
          </div>
        </div>
      ) : (
        totalCount > 0 && (
          <div className="mt-6 rounded-2xl border border-primary-light/50 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-ink">
                {interpolate(t.lessonContent.progressLabel, {
                  completed: String(completedCount),
                  total: String(totalCount),
                })}
              </span>
              <span className="text-ink-soft">
                {interpolate(t.lessonContent.percentComplete, { percent: String(percent) })}
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-cream-dark"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t.lessonContent.courseProgressAriaLabel}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )
      )}

      <h2 className="mt-8 font-serif text-xl text-ink">{t.lessonContent.lessonsListTitle}</h2>
      <div className="mt-4 flex flex-col gap-3">
        {lessonsWithAccess.length === 0 && (
          <p className="rounded-2xl border border-primary-light/50 bg-cream-dark/40 p-8 text-center text-ink-soft">
            {t.lessonContent.noLessonsYet}
          </p>
        )}
        {lessonsWithAccess.map((lesson) => {
          const Icon = STATE_ICON[lesson.state];
          const rowClasses = `flex items-center gap-3 rounded-2xl border p-4 transition ${
            lesson.state === "locked"
              ? "border-primary-light/30 bg-cream-dark/30 text-ink-soft/60"
              : "border-primary-light/50 bg-white text-ink hover:border-primary"
          }`;

          const rowContent = (
            <>
              <Icon className={`h-5 w-5 shrink-0 ${STATE_ICON_CLASS[lesson.state]}`} aria-hidden />
              <span className="flex-1 text-sm font-medium">
                {lesson.order}. {lesson.title}
              </span>
              {lesson.state === "locked" && (
                <span className="text-xs text-ink-soft/70">{t.lessonContent.lessonLocked}</span>
              )}
            </>
          );

          return lesson.state === "locked" ? (
            <div key={lesson.id} className={rowClasses}>
              {rowContent}
            </div>
          ) : (
            <Link
              key={lesson.id}
              href={`/tableau-de-bord/cours/${slug}/lecon/${lesson.id}`}
              className={rowClasses}
            >
              {rowContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
