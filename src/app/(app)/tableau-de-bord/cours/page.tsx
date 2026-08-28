import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/session";
import { db } from "@/lib/supabase/db";
import { getT } from "@/i18n/server";
import CourseCard from "@/components/CourseCard";
import EnrolledCourseCard from "@/components/EnrolledCourseCard";
import { getCourseProgressSummary } from "@/lib/lessonAccess";

export default async function CoursesPage() {
  const user = await getAppUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/cours");
  if (user.role === "ADMIN") redirect("/admin");

  const { t } = await getT();

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
    <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
      <h1 className="font-serif text-3xl text-ink">{t.dashboard.coursesPageTitle}</h1>
      <p className="mt-1.5 text-ink-soft">{t.dashboard.coursesPageSubtitle}</p>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-ink">{t.dashboard.myCoursesTitle}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t.dashboard.myCoursesSubtitle}</p>

        {enrollments.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-primary-light/60 bg-white px-6 py-10 text-center">
            <p className="text-sm text-ink-soft">{t.dashboard.noEnrollments}</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {enrollments.map((e) => (
              <EnrolledCourseCard
                key={e.id}
                t={t}
                course={e.course}
                status={e.status}
                progress={progressByCourseId.get(e.courseId)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl text-ink">{t.dashboard.availableCoursesTitle}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t.dashboard.availableCoursesSubtitle}</p>

        {availableCourses.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-primary-light/60 bg-cream-dark/30 px-6 py-10 text-center">
            <p className="text-sm text-ink-soft">{t.dashboard.noAvailableCourses}</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {availableCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                ctaLabel={t.dashboard.viewCourseAvailable}
                demoLabel={t.courses.watchDemo}
                statusBadge={t.dashboard.availableToEnrollBadge}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
