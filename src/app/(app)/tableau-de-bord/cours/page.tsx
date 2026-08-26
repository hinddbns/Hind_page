import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/session";
import { db } from "@/lib/supabase/db";
import { formatPrice } from "@/lib/format";
import { getT, interpolate } from "@/i18n/server";
import { getCourseProgressSummary } from "@/lib/lessonAccess";

export default async function CoursesPage() {
  const user = await getAppUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/cours");
  if (user.role === "ADMIN") redirect("/admin");

  const { t } = await getT();

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

  const { data: enrollments, error: enrollmentsError } = await db
    .from("Enrollment")
    .select("*, course:Course(*)")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false });
  if (enrollmentsError) throw enrollmentsError;

  const progressByCourseId = new Map(
    await Promise.all(
      enrollments
        .filter((e) => e.status === "APPROVED")
        .map(async (e) => [e.courseId, await getCourseProgressSummary(e.courseId, user.id)] as const)
    )
  );

  const audience = user.workspace === "ADOLESCENT" ? "ADOLESCENT" : "PARENT_TEACHER";
  const enrolledCourseIds = enrollments.map((e) => e.courseId);
  // Prisma's `notIn: []` excludes nothing (matches every row) — an empty
  // Postgres `not in (...)` list needs the filter omitted entirely to match
  // that, since `.not("id", "in", "()")` would otherwise behave differently.
  let availableCoursesQuery = db.from("Course").select("*").eq("published", true).eq("audience", audience);
  if (enrolledCourseIds.length > 0) {
    availableCoursesQuery = availableCoursesQuery.not("id", "in", `(${enrolledCourseIds.join(",")})`);
  }
  const { data: availableCourses, error: availableCoursesError } = await availableCoursesQuery.order("createdAt", {
    ascending: true,
  });
  if (availableCoursesError) throw availableCoursesError;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">{t.dashboard.coursesPageTitle}</h1>
      <p className="mt-2 text-ink-soft">{t.dashboard.coursesPageSubtitle}</p>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-ink">{t.dashboard.myCoursesTitle}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t.dashboard.myCoursesSubtitle}</p>

        {enrollments.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-primary-light/50 bg-white p-8 text-center">
            <p className="text-ink-soft">{t.dashboard.noEnrollments}</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
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
                    <h3 className="font-serif text-lg text-ink">{e.course.title}</h3>
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
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-serif text-xl text-ink">{t.dashboard.availableCoursesTitle}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t.dashboard.availableCoursesSubtitle}</p>

        {availableCourses.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-primary-light/50 bg-cream-dark/40 p-8 text-center">
            <p className="text-ink-soft">{t.dashboard.noAvailableCourses}</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {availableCourses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col gap-3 rounded-2xl border border-primary-light/50 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-serif text-lg text-ink">{course.title}</h3>
                  <p className="text-sm text-ink-soft">{formatPrice(course.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-ink">
                    {t.dashboard.availableToEnrollBadge}
                  </span>
                  <Link
                    href={`/cours/${course.slug}`}
                    className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-cream"
                  >
                    {t.dashboard.viewCourseAvailable}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
