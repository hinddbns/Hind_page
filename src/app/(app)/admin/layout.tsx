import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import UnreadBadge from "@/components/UnreadBadge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/connexion?next=/admin");
  if (session.user.role !== "ADMIN") redirect("/tableau-de-bord");

  const { t } = await getT();

  const items = [
    { href: "/admin", label: t.admin.overview },
    { href: "/admin/demandes", label: t.admin.demandes },
    { href: "/admin/cours", label: t.admin.coursNav },
    { href: "/admin/messages", label: t.admin.messagesNav },
    { href: "/admin/utilisateurs", label: t.admin.utilisateurs },
    { href: "/admin/parametres", label: t.admin.parametres },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-primary-light/30 hover:text-ink"
            >
              {item.label}
              {item.href === "/admin/messages" && <UnreadBadge />}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
