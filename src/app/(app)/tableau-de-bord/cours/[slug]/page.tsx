import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import SecureVideoPlayer from "@/components/SecureVideoPlayer";
import QuestionnaireForm from "@/components/QuestionnaireForm";

export default async function CourseContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const { slug } = await params;
  const { t } = await getT();

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      lessons: { orderBy: { order: "asc" } },
      questions: { include: { options: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
    },
  });
  if (!course) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
  });

  if (enrollment?.status !== "APPROVED") {
    redirect(`/cours/${slug}`);
  }

  const needsQuestionnaire = course.questionnaireEnabled && course.questions.length > 0;

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

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/tableau-de-bord" className="text-sm font-medium text-primary hover:underline">
        {t.lessonContent.backToDashboard}
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-ink">{course.title}</h1>

      <div className="mt-8 flex flex-col gap-6">
        {course.lessons.length === 0 && (
          <p className="rounded-2xl border border-primary-light/50 bg-cream-dark/40 p-8 text-center text-ink-soft">
            {t.lessonContent.noLessonsYet}
          </p>
        )}
        {course.lessons.map((lesson) => (
          <div key={lesson.id} className="rounded-2xl border border-primary-light/50 bg-white p-6">
            <h2 className="font-serif text-lg text-ink">
              {lesson.order}. {lesson.title}
            </h2>

            {lesson.videoPath && (
              <SecureVideoPlayer
                className="mt-4 aspect-video w-full rounded-xl bg-black"
                src={`/api/videos/${lesson.id}`}
              />
            )}

            <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{lesson.content}</p>

            {!lesson.videoPath && lesson.videoUrl && (
              <iframe
                src={lesson.videoUrl}
                className="mt-4 aspect-video w-full rounded-xl bg-black"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={lesson.title}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
