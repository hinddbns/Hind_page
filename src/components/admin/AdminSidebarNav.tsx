"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UnreadBadge from "@/components/UnreadBadge";

export default function AdminSidebarNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-1">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              active ? "bg-primary text-cream" : "text-ink-soft hover:bg-primary-light/30 hover:text-ink"
            }`}
          >
            {item.label}
            {item.href === "/admin/messages" && <UnreadBadge />}
          </Link>
        );
      })}
    </nav>
  );
}
