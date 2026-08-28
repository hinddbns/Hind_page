import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { interpolate } from "@/i18n/server";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { CourseProgressSummary } from "@/lib/lessonAccess";

type EnrollmentStatus = "PENDING" | "APPROVED" | "REJECTED";

const STATUS_STYLE: Record<EnrollmentStatus, string> = {
  PENDING: "border-accent/40 bg-accent/10 text-ink",
  APPROVED: "border-success/30 bg-success/10 text-success",
  REJECTED: "border-danger/30 bg-danger/10 text-danger",
};

// One enrolled-course card, shared by /tableau-de-bord and
// /tableau-de-bord/cours (the markup used to be copy-pasted in both). Same
// links, statuses and progress data as before — presentation only.
export default function EnrolledCourseCard({
  t,
  course,
  status,
  progress,
}: {
  t: Dictionary;
  course: { title: string; price: number; slug: string };
  status: EnrollmentStatus;
  progress?: CourseProgressSummary | null;
}) {
  const statusLabel =
    status === "APPROVED"
      ? t.dashboard.statusApproved
      : status === "REJECTED"
        ? t.dashboard.statusRejected
        : t.dashboard.statusPending;

  const isApproved = status === "APPROVED";
  const continueHref =
    isApproved && progress && !progress.isComplete && progress.currentLessonId
      ? `/tableau-de-bord/cours/${course.slug}/lecon/${progress.currentLessonId}`
      : `/tableau-de-bord/cours/${course.slug}`;
  const showProgress = isApproved && progress && progress.totalLessons > 0;

  return (
    <article className="flex flex-col rounded-2xl border border-primary-light/60 bg-white p-5 transition hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-serif text-lg text-primary-dark"
        >
          {course.title.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg leading-snug text-ink">{course.title}</h3>
          <p className="mt-0.5 text-xs text-ink-soft">{formatPrice(course.price)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
        >
          {statusLabel}
        </span>
      </div>

      {showProgress && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
            <span>
              {interpolate(t.lessonContent.progressLabel, {
                completed: String(progress.completedLessons),
                total: String(progress.totalLessons),
              })}
            </span>
            <span className="font-medium text-ink">
              {interpolate(t.lessonContent.percentComplete, { percent: String(progress.percent) })}
            </span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-dark"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.lessonContent.courseProgressAriaLabel}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex">
        {isApproved ? (
          <Link
            href={continueHref}
            className="flex-1 rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-cream transition hover:bg-primary-dark"
          >
            {t.dashboard.continueCourse}
          </Link>
        ) : (
          <Link
            href={`/cours/${course.slug}`}
            className="flex-1 rounded-full border border-primary px-4 py-2 text-center text-sm font-medium text-primary transition hover:bg-primary hover:text-cream"
          >
            {t.dashboard.view}
          </Link>
        )}
      </div>
    </article>
  );
}
