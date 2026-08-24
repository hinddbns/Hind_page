import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getAppUser } from "@/lib/session";
import { getT } from "@/i18n/server";
import { interpolate } from "@/i18n/config";
import SecureVideoPlayer from "@/components/SecureVideoPlayer";
import LessonVideoPlayer from "@/components/LessonVideoPlayer";
import LessonCompleteButton from "@/components/LessonCompleteButton";
import {
  getStudentCourse,
  getApprovedEnrollment,
  isQuestionnaireComplete,
  getLessonsWithAccess,
  getLessonProgressRecord,
} from "@/lib/lessonAccess";
import type { LessonAccessState } from "@/lib/lessonAccess";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const user = await getAppUser();
  if (!user) redirect("/connexion");

  const { slug, lessonId } = await params;
  const { t } = await getT();

  const course = await getStudentCourse(slug);
  if (!course) notFound();

  const isAdmin = user.role === "ADMIN";
  const enrollment = isAdmin ? null : await getApprovedEnrollment(user.id, course.id);

  if (!isAdmin && enrollment?.status !== "APPROVED") {
    redirect(`/cours/${slug}`);
  }

  if (!isAdmin) {
    const questionnaireDone = await isQuestionnaireComplete(course, user.id);
    if (!questionnaireDone) {
      redirect(`/tableau-de-bord/cours/${slug}`);
    }
  }

  const lessonsWithAccess: (typeof course.lessons[number] & { state: LessonAccessState })[] = isAdmin
    ? course.lessons.map((l) => ({ ...l, state: "current" as const }))
    : await getLessonsWithAccess(course.id, user.id, course.lessons);

  const index = lessonsWithAccess.findIndex((l) => l.id === lessonId);
  if (index === -1) notFound();
  const lesson = lessonsWithAccess[index];

  // Server-side gate — a locked lesson isn't reachable by typing its URL directly.
  if (lesson.state === "locked") {
    redirect(`/tableau-de-bord/cours/${slug}`);
  }

  const previous = index > 0 ? lessonsWithAccess[index - 1] : null;
  const next = index < lessonsWithAccess.length - 1 ? lessonsWithAccess[index + 1] : null;
  const nextAccessible = next ? next.state !== "locked" : false;

  const progress = isAdmin ? null : await getLessonProgressRecord(user.id, lesson.id);

  const totalCount = lessonsWithAccess.length;
  const completedCount = lessonsWithAccess.filter((l) => l.state === "completed").length;
  const coursePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/tableau-de-bord/cours/${slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t.lessonContent.backToCourseOverview}
        </Link>
        <span className="text-xs text-ink-soft">
          {interpolate(t.lessonContent.lessonOf, {
            current: String(index + 1),
            total: String(lessonsWithAccess.length),
          })}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-primary">{course.title}</p>
      <h1 className="mt-1 font-serif text-2xl text-ink">
        {lesson.order}. {lesson.title}
      </h1>

      {totalCount > 0 && (
        <div
          className="mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-cream-dark"
          role="progressbar"
          aria-valuenow={coursePercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t.lessonContent.courseProgressAriaLabel}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${coursePercent}%` }} />
        </div>
      )}

      {lesson.state === "completed" && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {t.lessonContent.lessonCompletedBadge}
        </span>
      )}

      {lesson.videoPath && isAdmin && (
        <SecureVideoPlayer
          className="mt-5 aspect-video w-full rounded-xl bg-black"
          src={`/api/videos/${lesson.id}`}
        />
      )}
      {lesson.videoPath && !isAdmin && (
        <LessonVideoPlayer
          className="mt-5 aspect-video w-full rounded-xl bg-black"
          src={`/api/videos/${lesson.id}`}
          lessonId={lesson.id}
          initialPositionSeconds={progress?.lastPositionSeconds ?? 0}
          initialFurthestSeconds={progress?.furthestSeconds ?? 0}
          initialCompleted={progress?.completed ?? false}
        />
      )}
      {!lesson.videoPath && lesson.videoUrl && (
        <iframe
          src={lesson.videoUrl}
          className="mt-5 aspect-video w-full rounded-xl bg-black"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={lesson.title}
        />
      )}

      <p className="mt-4 whitespace-pre-line text-sm text-ink-soft">{lesson.content}</p>

      {!lesson.videoPath && !isAdmin && lesson.state !== "completed" && (
        <LessonCompleteButton lessonId={lesson.id} />
      )}

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-primary-light/40 pt-6">
        {previous ? (
          <Link
            href={`/tableau-de-bord/cours/${slug}/lecon/${previous.id}`}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-cream"
          >
            {t.lessonContent.previousLesson}
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          nextAccessible ? (
            <Link
              href={`/tableau-de-bord/cours/${slug}/lecon/${next.id}`}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-cream hover:bg-primary-dark"
            >
              {t.lessonContent.nextLesson}
            </Link>
          ) : (
            <span className="text-end text-xs text-ink-soft/70">
              {t.lessonContent.nextLessonLockedHint}
            </span>
          )
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
