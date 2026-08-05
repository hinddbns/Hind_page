import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { getT, interpolate } from "@/i18n/server";
import CoachReminder from "@/components/CoachReminder";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?next=/tableau-de-bord");
  if (session.user.role === "ADMIN") redirect("/admin");

  const { t } = await getT();
  const coursesHref = session.user.workspace === "ADOLESCENT" ? "/ados" : "/parents-enseignants";

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
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
    where: { userId: session.user.id },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">{interpolate(t.dashboard.hello, { name: session.user.name ?? "" })}</h1>
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
          {enrollments.map((e) => (
            <div
              key={e.id}
              className="flex flex-col gap-3 rounded-2xl border border-primary-light/50 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="font-serif text-lg text-ink">{e.course.title}</h2>
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
                    {t.dashboard.access}
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
