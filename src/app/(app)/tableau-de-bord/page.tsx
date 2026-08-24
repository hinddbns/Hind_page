import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { getT, interpolate } from "@/i18n/server";
import CoachReminder from "@/components/CoachReminder";
import { getCourseProgressSummary } from "@/lib/lessonAccess";

export default async function DashboardPage() {
  const user = await getAppUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord");
  if (user.role === "ADMIN") redirect("/admin");

  const { t } = await getT();
  const coursesHref = "/tableau-de-bord/cours";

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profileCategory: true },
  });

  const STATUS_LABEL: Record<string, string> = {
    PENDING: t.dashboard.statusPending,
    APPROVED: t.dashboard.statusApproved,
    REJECTED: t.dashboard.statusRejected,
  };
  const STATUS_STYLE: Record<string, string> = {
    PENDING: "bg-accent/10 text-ink border-accent/40",
    APPROVED: "bg-success/10 text-success border-success/30",
    REJECTED: "bg-danger/10 text-danger border-danger/30",
  };

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  const progressByCourseId = new Map(
    await Promise.all(
      enrollments
        .filter((e) => e.status === "APPROVED")
        .map(async (e) => [e.courseId, await getCourseProgressSummary(e.courseId, user.id)] as const)
    )
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">{interpolate(t.dashboard.hello, { name: user.name ?? "" })}</h1>
      <p className="mt-2 text-ink-soft">{t.dashboard.subtitle}</p>

      <CoachReminder t={t} category={me?.profileCategory} />

      {enrollments.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-primary-light/50 bg-white p-8 text-center">
          <p className="text-ink-soft">{t.dashboard.noEnrollments}</p>
          <Link
            href={coursesHref}
            className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream hover:bg-primary-dark"
          >
            {t.dashboard.discoverCourses}
          </Link>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-4">
          {enrollments.map((e) => {
            const progress = progressByCourseId.get(e.courseId);
            const continueHref =
              progress && !progress.isComplete && progress.currentLessonId
                ? `/tableau-de-bord/cours/${e.course.slug}/lecon/${progress.currentLessonId}`
                : `/tableau-de-bord/cours/${e.course.slug}`;

            return (
              <div
                key={e.id}
                className="flex flex-col gap-3 rounded-2xl border border-primary-light/50 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h2 className="font-serif text-lg text-ink">{e.course.title}</h2>
                  <p className="text-sm text-ink-soft">{formatPrice(e.course.price)}</p>
                  {progress && progress.totalLessons > 0 && (
                    <div className="mt-3 max-w-xs">
                      <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
                        <span>
                          {interpolate(t.lessonContent.progressLabel, {
                            completed: String(progress.completedLessons),
                            total: String(progress.totalLessons),
                          })}
                        </span>
                        <span>
                          {interpolate(t.lessonContent.percentComplete, { percent: String(progress.percent) })}
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-dark"
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
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[e.status]}`}
                  >
                    {STATUS_LABEL[e.status]}
                  </span>
                  {e.status === "APPROVED" ? (
                    <Link
                      href={continueHref}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-cream hover:bg-primary-dark"
                    >
                      {t.dashboard.continueCourse}
                    </Link>
                  ) : (
                    <Link
                      href={`/cours/${e.course.slug}`}
                      className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-cream"
                    >
                      {t.dashboard.view}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          <Link
            href={coursesHref}
            className="mt-2 text-center text-sm font-medium text-primary hover:underline"
          >
            {t.dashboard.accessMore}
          </Link>
        </div>
      )}
    </div>
  );
}
