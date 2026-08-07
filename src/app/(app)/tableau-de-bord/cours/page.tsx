import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { getT } from "@/i18n/server";

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?next=/tableau-de-bord/cours");
  if (session.user.role === "ADMIN") redirect("/admin");

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

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  const audience = session.user.workspace === "ADOLESCENT" ? "ADOLESCENT" : "PARENT_TEACHER";
  const availableCourses = await prisma.course.findMany({
    where: {
      published: true,
      audience,
      id: { notIn: enrollments.map((e) => e.courseId) },
    },
    orderBy: { createdAt: "asc" },
  });

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
            {enrollments.map((e) => (
              <div
                key={e.id}
                className="flex flex-col gap-3 rounded-2xl border border-primary-light/50 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-serif text-lg text-ink">{e.course.title}</h3>
                  <p className="text-sm text-ink-soft">{formatPrice(e.course.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[e.status]}`}
                  >
                    {STATUS_LABEL[e.status]}
                  </span>
                  {e.status === "APPROVED" ? (
                    <Link
                      href={`/tableau-de-bord/cours/${e.course.slug}`}
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
            ))}
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
