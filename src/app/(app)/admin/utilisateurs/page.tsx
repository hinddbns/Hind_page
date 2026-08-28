import Link from "next/link";
import type { Enums } from "@/lib/supabase/database.types";
import { db, pgTimestampToDate } from "@/lib/supabase/db";

type ProfileCategory = Enums<"ProfileCategory">;
import { getT } from "@/i18n/server";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import AdminSearchForm from "@/components/admin/AdminSearchForm";
import { getSuspendedUserIds } from "@/lib/suspension";

function categoryLabel(t: Dictionary, category: ProfileCategory | null) {
  switch (category) {
    case "MOTHER":
      return t.auth.profileCategoryMother;
    case "TEACHER":
      return t.auth.profileCategoryTeacher;
    case "ADOLESCENT":
      return t.auth.profileCategoryAdolescent;
    case "OTHER":
      return t.auth.profileCategoryOther;
    default:
      return t.admin.categoryUnspecified;
  }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; q?: string }>;
}) {
  const { t } = await getT();
  const { workspace: workspaceParam, q } = await searchParams;
  const activeWorkspace = workspaceParam === "ADOLESCENT" || workspaceParam === "PARENT_TEACHER" ? workspaceParam : undefined;
  const searchQuery = q?.trim();

  let query = db
    .from("User")
    .select("*, enrollments:Enrollment(count)")
    .order("createdAt", { ascending: false });
  if (activeWorkspace === "ADOLESCENT") {
    query = query.eq("profileCategory", "ADOLESCENT");
  } else if (activeWorkspace === "PARENT_TEACHER") {
    query = query.or("profileCategory.is.null,profileCategory.in.(MOTHER,TEACHER,OTHER)");
  }
  const { data, error } = await query;
  if (error) throw error;

  const suspendedIds = await getSuspendedUserIds();

  // Prisma's default `contains` is a case-sensitive literal-substring match, so
  // String.includes reproduces it exactly, without LIKE-wildcard escaping.
  const users = (
    searchQuery
      ? data.filter((u) => u.name.includes(searchQuery) || u.email.includes(searchQuery))
      : data
  ).map((u) => ({
    ...u,
    createdAt: pgTimestampToDate(u.createdAt),
    _count: { enrollments: u.enrollments[0]?.count ?? 0 },
  }));

  const tabs: { value: "ADOLESCENT" | "PARENT_TEACHER" | undefined; label: string }[] = [
    { value: undefined, label: t.admin.filterAll },
    { value: "PARENT_TEACHER", label: t.admin.audienceParentTeacher },
    { value: "ADOLESCENT", label: t.admin.audienceAdolescent },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">{t.admin.usersTitle}</h1>

      <div className="mt-6 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/utilisateurs?workspace=${tab.value}` : "/admin/utilisateurs"}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeWorkspace === tab.value
                ? "border-primary bg-primary text-cream"
                : "border-primary-light text-ink-soft hover:border-primary hover:text-primary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <AdminSearchForm
        placeholder={t.admin.searchUsersPlaceholder}
        searchLabel={t.admin.search}
        defaultValue={searchQuery}
        hiddenParams={{ workspace: activeWorkspace }}
      />

      <div className="mt-6 flex flex-col gap-4">
        {users.length === 0 && searchQuery && (
          <p className="text-sm text-ink-soft">{t.admin.noSearchResults}</p>
        )}
        {users.map((u) => (
          <div
            key={u.id}
            className="flex flex-col gap-3 rounded-2xl border border-primary-light/50 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-ink">{u.name}</p>
              <p className="text-sm text-ink-soft">{u.email}</p>
              <p className="mt-1 text-xs text-ink-soft/70">
                {categoryLabel(t, u.profileCategory)} · {u._count.enrollments} {t.admin.requestsCount} ·{" "}
                {u.createdAt.toLocaleDateString("ar-MA")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  suspendedIds.has(u.id)
                    ? "border-danger/30 bg-danger/10 text-danger"
                    : "border-success/30 bg-success/10 text-success"
                }`}
              >
                {suspendedIds.has(u.id) ? t.admin.accountSuspendedShort : t.admin.accountActiveShort}
              </span>
              {u.role === "ADMIN" && (
                <span className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary-dark">
                  {t.profil.roleAdmin}
                </span>
              )}
              <Link
                href={`/admin/utilisateurs/${u.id}`}
                className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:border-primary hover:text-primary"
              >
                {t.admin.view}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
