import Link from "next/link";
import { db } from "@/lib/supabase/db";
import { getT } from "@/i18n/server";

export default async function AdminOverviewPage() {
  const { t } = await getT();

  const [pendingCountRes, userCountRes, courseCountRes, approvedCountRes] = await Promise.all([
    db.from("Enrollment").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
    db.from("User").select("*", { count: "exact", head: true }).eq("role", "USER"),
    db.from("Course").select("*", { count: "exact", head: true }),
    db.from("Enrollment").select("*", { count: "exact", head: true }).eq("status", "APPROVED"),
  ]);
  if (pendingCountRes.error) throw pendingCountRes.error;
  if (userCountRes.error) throw userCountRes.error;
  if (courseCountRes.error) throw courseCountRes.error;
  if (approvedCountRes.error) throw approvedCountRes.error;
  const pendingCount = pendingCountRes.count ?? 0;
  const userCount = userCountRes.count ?? 0;
  const courseCount = courseCountRes.count ?? 0;
  const approvedCount = approvedCountRes.count ?? 0;

  const { data: recentPending, error: recentPendingError } = await db
    .from("Enrollment")
    .select("*, user:User(*), course:Course(*)")
    .eq("status", "PENDING")
    .order("createdAt", { ascending: true })
    .limit(5);
  if (recentPendingError) throw recentPendingError;

  const stats = [
    { label: t.admin.pendingRequests, value: pendingCount, href: "/admin/demandes" },
    { label: t.admin.activeAccess, value: approvedCount, href: "/admin/demandes" },
    { label: t.admin.usersCount, value: userCount, href: "/admin/utilisateurs" },
    { label: t.admin.coursesCount, value: courseCount, href: "/admin/cours" },
  ];

  const [
    parentPendingRes,
    parentApprovedRes,
    parentCoursesRes,
    parentUsersRes,
    adoPendingRes,
    adoApprovedRes,
    adoCoursesRes,
    adoUsersRes,
  ] = await Promise.all([
    db
      .from("Enrollment")
      .select("*, course:Course!inner(audience)", { count: "exact", head: true })
      .eq("status", "PENDING")
      .eq("course.audience", "PARENT_TEACHER"),
    db
      .from("Enrollment")
      .select("*, course:Course!inner(audience)", { count: "exact", head: true })
      .eq("status", "APPROVED")
      .eq("course.audience", "PARENT_TEACHER"),
    db.from("Course").select("*", { count: "exact", head: true }).eq("audience", "PARENT_TEACHER"),
    db
      .from("User")
      .select("*", { count: "exact", head: true })
      .eq("role", "USER")
      .or("profileCategory.is.null,profileCategory.in.(MOTHER,TEACHER,OTHER)"),
    db
      .from("Enrollment")
      .select("*, course:Course!inner(audience)", { count: "exact", head: true })
      .eq("status", "PENDING")
      .eq("course.audience", "ADOLESCENT"),
    db
      .from("Enrollment")
      .select("*, course:Course!inner(audience)", { count: "exact", head: true })
      .eq("status", "APPROVED")
      .eq("course.audience", "ADOLESCENT"),
    db.from("Course").select("*", { count: "exact", head: true }).eq("audience", "ADOLESCENT"),
    db.from("User").select("*", { count: "exact", head: true }).eq("role", "USER").eq("profileCategory", "ADOLESCENT"),
  ]);
  for (const r of [
    parentPendingRes,
    parentApprovedRes,
    parentCoursesRes,
    parentUsersRes,
    adoPendingRes,
    adoApprovedRes,
    adoCoursesRes,
    adoUsersRes,
  ]) {
    if (r.error) throw r.error;
  }
  const parentPending = parentPendingRes.count ?? 0;
  const parentApproved = parentApprovedRes.count ?? 0;
  const parentCourses = parentCoursesRes.count ?? 0;
  const parentUsers = parentUsersRes.count ?? 0;
  const adoPending = adoPendingRes.count ?? 0;
  const adoApproved = adoApprovedRes.count ?? 0;
  const adoCourses = adoCoursesRes.count ?? 0;
  const adoUsers = adoUsersRes.count ?? 0;

  const byWorkspace = [
    {
      label: t.admin.audienceParentTeacher,
      pending: parentPending,
      approved: parentApproved,
      courses: parentCourses,
      users: parentUsers,
      href: "/admin/cours?audience=PARENT_TEACHER",
    },
    {
      label: t.admin.audienceAdolescent,
      pending: adoPending,
      approved: adoApproved,
      courses: adoCourses,
      users: adoUsers,
      href: "/admin/cours?audience=ADOLESCENT",
    },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">{t.admin.overview}</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border border-primary-light/50 bg-white p-6 transition hover:border-primary"
          >
            <p className="text-sm text-ink-soft">{s.label}</p>
            <p className="mt-2 font-serif text-3xl text-ink">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-xl text-ink">{t.admin.byWorkspaceTitle}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {byWorkspace.map((w) => (
            <Link
              key={w.label}
              href={w.href}
              className="rounded-2xl border border-secondary/25 bg-white p-6 transition hover:border-secondary"
            >
              <p className="font-serif text-lg text-ink">{w.label}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-ink-soft sm:grid-cols-4">
                <div>
                  <p className="font-serif text-xl text-ink">{w.pending}</p>
                  <p className="text-xs">{t.admin.pendingRequests}</p>
                </div>
                <div>
                  <p className="font-serif text-xl text-ink">{w.approved}</p>
                  <p className="text-xs">{t.admin.activeAccess}</p>
                </div>
                <div>
                  <p className="font-serif text-xl text-ink">{w.courses}</p>
                  <p className="text-xs">{t.admin.coursesCount}</p>
                </div>
                <div>
                  <p className="font-serif text-xl text-ink">{w.users}</p>
                  <p className="text-xs">{t.admin.usersCount}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink">{t.admin.recentPending}</h2>
          <Link href="/admin/demandes" className="text-sm font-medium text-primary hover:underline">
            {t.admin.seeAll}
          </Link>
        </div>

        {recentPending.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">{t.admin.noRecentPending}</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {recentPending.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-primary-light/50 bg-white p-4 text-sm"
              >
                <div>
                  <span className="font-medium text-ink">{e.user.name}</span>{" "}
                  <span className="text-ink-soft">— {e.course.title}</span>
                </div>
                <Link href="/admin/demandes" className="text-primary hover:underline">
                  {t.admin.process}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
