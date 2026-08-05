import Link from "next/link";
import type { ProfileCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import type { Dictionary } from "@/i18n/dictionaries/ar";

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
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { t } = await getT();
  const { workspace: workspaceParam } = await searchParams;
  const activeWorkspace = workspaceParam === "ADOLESCENT" || workspaceParam === "PARENT_TEACHER" ? workspaceParam : undefined;

  const users = await prisma.user.findMany({
    where:
      activeWorkspace === "ADOLESCENT"
        ? { profileCategory: "ADOLESCENT" }
        : activeWorkspace === "PARENT_TEACHER"
          ? { OR: [{ profileCategory: null }, { profileCategory: { in: ["MOTHER", "TEACHER", "OTHER"] } }] }
          : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { enrollments: true } } },
  });

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

      <div className="mt-6 overflow-x-auto rounded-2xl border border-primary-light/50 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-primary-light/50 text-ink-soft">
            <tr>
              <th className="px-5 py-3 font-medium">{t.admin.colName}</th>
              <th className="px-5 py-3 font-medium">{t.admin.colEmail}</th>
              <th className="px-5 py-3 font-medium">{t.admin.colRole}</th>
              <th className="px-5 py-3 font-medium">{t.admin.colCategory}</th>
              <th className="px-5 py-3 font-medium">{t.admin.colRequests}</th>
              <th className="px-5 py-3 font-medium">{t.admin.colJoined}</th>
              <th className="px-5 py-3 font-medium">{t.admin.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-primary-light/20 last:border-0">
                <td className="px-5 py-3 text-ink">{u.name}</td>
                <td className="px-5 py-3 text-ink-soft">{u.email}</td>
                <td className="px-5 py-3 text-ink-soft">{u.role}</td>
                <td className="px-5 py-3 text-ink-soft">{categoryLabel(t, u.profileCategory)}</td>
                <td className="px-5 py-3 text-ink-soft">{u._count.enrollments}</td>
                <td className="px-5 py-3 text-ink-soft">
                  {u.createdAt.toLocaleDateString("ar-MA")}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/utilisateurs/${u.id}`}
                    className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink hover:border-primary hover:text-primary"
                  >
                    {t.admin.view}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
