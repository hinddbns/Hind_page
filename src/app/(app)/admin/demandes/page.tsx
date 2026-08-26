import Link from "next/link";
import { db, pgTimestampToDate } from "@/lib/supabase/db";
import { getT } from "@/i18n/server";
import AdminSearchForm from "@/components/admin/AdminSearchForm";
import BulkEnrollmentList from "@/components/admin/BulkEnrollmentList";

export default async function AdminDemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string; q?: string }>;
}) {
  const { t } = await getT();
  const { audience: audienceParam, q } = await searchParams;
  const activeAudience = audienceParam === "ADOLESCENT" || audienceParam === "PARENT_TEACHER" ? audienceParam : undefined;
  const searchQuery = q?.trim();

  const STATUS_LABEL: Record<string, string> = {
    PENDING: t.admin.statusPending,
    APPROVED: t.admin.statusApproved,
    REJECTED: t.admin.statusRejected,
  };

  let query = db
    .from("Enrollment")
    .select("*, user:User!inner(*), course:Course!inner(*)")
    .order("status", { ascending: true })
    .order("createdAt", { ascending: true });
  if (activeAudience) query = query.eq("course.audience", activeAudience);
  const { data, error } = await query;
  if (error) throw error;

  // Prisma's default `contains` is a case-sensitive literal-substring match, so
  // String.includes reproduces it exactly. The search is kept in application
  // code because it ORs across two different embedded relations (user, course),
  // which PostgREST cannot express in a single request.
  const enrollments = (
    searchQuery
      ? data.filter(
          (e) =>
            e.user.name.includes(searchQuery) ||
            e.user.email.includes(searchQuery) ||
            e.course.title.includes(searchQuery)
        )
      : data
  ).map((e) => ({ ...e, createdAt: pgTimestampToDate(e.createdAt) }));

  const tabs: { value: "ADOLESCENT" | "PARENT_TEACHER" | undefined; label: string }[] = [
    { value: undefined, label: t.admin.filterAll },
    { value: "PARENT_TEACHER", label: t.admin.audienceParentTeacher },
    { value: "ADOLESCENT", label: t.admin.audienceAdolescent },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">{t.admin.demandesTitle}</h1>
      <p className="mt-2 text-ink-soft">{t.admin.demandesSubtitle}</p>

      <div className="mt-6 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/demandes?audience=${tab.value}` : "/admin/demandes"}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeAudience === tab.value
                ? "border-primary bg-primary text-cream"
                : "border-primary-light text-ink-soft hover:border-primary hover:text-primary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <AdminSearchForm
        placeholder={t.admin.searchRequestsPlaceholder}
        searchLabel={t.admin.search}
        defaultValue={searchQuery}
        hiddenParams={{ audience: activeAudience }}
      />

      {enrollments.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          {searchQuery ? t.admin.noSearchResults : t.admin.noRequests}
        </p>
      ) : (
        <div className="mt-6">
          <BulkEnrollmentList t={t} enrollments={enrollments} statusLabel={STATUS_LABEL} />
        </div>
      )}
    </div>
  );
}
