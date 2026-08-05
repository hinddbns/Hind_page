import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { getT } from "@/i18n/server";
import { addLesson, deleteLesson, updateCourse, updateLesson } from "../../actions";
import CourseForm from "@/components/admin/CourseForm";
import LessonForm from "@/components/admin/LessonForm";
import ConfirmActionForm from "@/components/admin/ConfirmActionForm";

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { t } = await getT();

  const course = await prisma.course.findUnique({
    where: { id },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  if (!course) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/admin/cours" className="text-sm font-medium text-primary hover:underline">
          {t.admin.backToCourses}
        </Link>
        <Link
          href={`/admin/cours/${course.id}/questionnaire`}
          className="rounded-full border border-secondary/40 px-4 py-2 text-sm font-medium text-secondary hover:bg-secondary/10"
        >
          {t.admin.questionnaireNav} {course.questionnaireEnabled ? "✓" : ""}
        </Link>
      </div>
      <h1 className="mt-4 font-serif text-3xl text-ink">
        {course.title} <span className="text-lg text-ink-soft">· {formatPrice(course.price)}</span>
      </h1>

      {/* Aperçu en lecture seule */}
      <div className="mt-6 rounded-2xl border border-primary-light/50 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">{t.admin.courseOverviewTitle}</h2>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              course.published
                ? "border-success/30 bg-success/10 text-success"
                : "border-ink/15 bg-ink/5 text-ink-soft"
            }`}
          >
            {course.published ? t.admin.published : t.admin.draft}
          </span>
        </div>

        <div className="mt-4">
          <p className="font-serif text-lg text-ink">{course.title}</p>
          <p className="mt-1 text-sm text-ink-soft">{course.summary}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{course.description}</p>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-primary-light/40 bg-cream-dark/40">
          {course.demoVideoPath ? (
            <video controls className="aspect-video w-full bg-black" src={course.demoVideoPath} />
          ) : course.demoVideoUrl ? (
            <a
              href={course.demoVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center px-6 py-10 text-sm font-medium text-primary hover:underline"
            >
              {t.admin.externalVideoLink}
            </a>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-ink-soft">{t.admin.noVideo}</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <CourseForm
          action={updateCourse.bind(null, course.id)}
          mode="edit"
          initial={{
            title: course.title,
            summary: course.summary,
            description: course.description,
            price: course.price,
            demoVideoUrl: course.demoVideoUrl,
            audience: course.audience,
          }}
        />
      </div>

      <h2 className="mt-10 font-serif text-xl text-ink">{t.admin.lessonsTitle}</h2>
      <div className="mt-4 flex flex-col gap-4">
        {course.lessons.map((lesson) => (
          <div key={lesson.id} className="rounded-2xl border border-primary-light/50 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {lesson.order}. {lesson.title}
                </p>
                <p className="mt-2 text-sm text-ink-soft">{lesson.content}</p>
              </div>
              <ConfirmActionForm
                action={deleteLesson.bind(null, lesson.id, course.id)}
                confirmMessage={t.admin.confirmDeleteLesson}
                label={t.admin.delete}
                pendingLabel={t.admin.deleting}
                className="shrink-0 rounded-full border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-primary-light/40 bg-cream-dark/40">
              {lesson.videoPath ? (
                <video controls className="aspect-video w-full bg-black" src={`/api/videos/${lesson.id}`} />
              ) : lesson.videoUrl ? (
                <a
                  href={lesson.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center px-6 py-8 text-sm font-medium text-primary hover:underline"
                >
                  {t.admin.externalVideoLink}
                </a>
              ) : (
                <p className="px-6 py-8 text-center text-sm text-ink-soft">{t.admin.noVideo}</p>
              )}
            </div>

            <LessonForm
              action={updateLesson.bind(null, lesson.id, course.id)}
              mode="edit"
              initial={{
                title: lesson.title,
                content: lesson.content,
                order: lesson.order,
                videoUrl: lesson.videoUrl,
              }}
            />
          </div>
        ))}
        {course.lessons.length === 0 && (
          <p className="text-sm text-ink-soft">{t.admin.noLessons}</p>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-primary-light/50 bg-white p-6">
        <h2 className="font-serif text-lg text-ink">{t.admin.addLesson}</h2>
        <LessonForm
          action={addLesson.bind(null, course.id)}
          mode="add"
          initial={{ title: "", content: "", order: course.lessons.length + 1, videoUrl: "" }}
        />
      </div>
    </div>
  );
}
