import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getAppUser } from "@/lib/session";
import { db } from "@/lib/supabase/db";
import { getT, interpolate } from "@/i18n/server";
import CoachReminder from "@/components/CoachReminder";
import EnrolledCourseCard from "@/components/EnrolledCourseCard";
import { getCourseProgressSummary } from "@/lib/lessonAccess";

export default async function DashboardPage() {
  const user = await getAppUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord");
  if (user.role === "ADMIN") redirect("/admin");

  const { t } = await getT();
  const coursesHref = "/tableau-de-bord/cours";

  const { data: me, error: meError } = await db
    .from("User")
    .select("profileCategory")
    .eq("id", user.id)
    .maybeSingle();
  if (meError) throw meError;

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

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
      <header>
        <h1 className="font-serif text-3xl text-ink sm:text-[2rem]">
          {interpolate(t.dashboard.hello, { name: user.name ?? "" })}
        </h1>
        <p className="mt-1.5 text-ink-soft">{t.dashboard.subtitle}</p>
      </header>

      {enrollments.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-primary-light/60 bg-white px-6 py-12 text-center">
          <span
            aria-hidden
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary-dark"
          >
            <BookOpen className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-serif text-xl text-ink">{t.dashboard.dashboardEmptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{t.dashboard.noEnrollments}</p>
          <Link
            href={coursesHref}
            className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-cream transition hover:bg-primary-dark"
          >
            {t.dashboard.discoverCourses}
          </Link>
        </section>
      ) : (
        <section className="mt-8">
          <h2 className="font-serif text-xl text-ink">{t.dashboard.myCoursesTitle}</h2>
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
          <Link
            href={coursesHref}
            className="mt-5 inline-flex rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-cream"
          >
            {t.dashboard.accessMore}
          </Link>
        </section>
      )}

      <div className="mt-10">
        <CoachReminder t={t} category={me?.profileCategory} />
      </div>
    </div>
  );
}
