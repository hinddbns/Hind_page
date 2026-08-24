"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import { useLocale } from "@/i18n/LocaleProvider";
import { signOutAndRedirect } from "@/lib/supabase/signOut";
import type { AppUser } from "@/lib/session";
import UnreadBadge from "./UnreadBadge";

export default function AppNav({ user }: { user: AppUser }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === "ADMIN";
  const homeHref = isAdmin ? "/admin" : "/tableau-de-bord";
  const isAdosWorkspace = !isAdmin && user.workspace === "ADOLESCENT";
  const isParentWorkspace = !isAdmin && user.workspace === "PARENT_TEACHER";
  const coursesHref = "/tableau-de-bord/cours";

  const isDashboardActive = pathname === "/tableau-de-bord";
  const isMessagesActive = pathname.startsWith("/tableau-de-bord/messages");
  const isAdminActive = pathname.startsWith("/admin");
  const isCoursesActive = pathname.startsWith("/tableau-de-bord/cours");
  const isProfilActive = pathname === "/profil";
  const linkClass = (active: boolean) => (active ? "text-primary" : "hover:text-primary");

  return (
    <header className="sticky top-0 z-50 border-b border-secondary/25 bg-app-tint/95 backdrop-blur">
      <div
        className={`h-[3px] ${
          isAdosWorkspace
            ? "bg-gradient-to-l from-accent via-secondary-light to-secondary"
            : isParentWorkspace
              ? "bg-gradient-to-l from-olive via-secondary-light to-secondary"
              : "bg-gradient-to-l from-secondary via-secondary-light to-primary-light"
        }`}
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={homeHref} className="flex items-center">
          <Image
            src={site.logo}
            alt={site.name}
            width={site.logoWidth}
            height={site.logoHeight}
            priority
            className="h-10 w-auto rounded-lg"
          />
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium text-ink-soft md:flex">
          {!isAdmin && (
            <>
              <Link href="/tableau-de-bord" aria-current={isDashboardActive ? "page" : undefined} className={linkClass(isDashboardActive)}>{t.nav.monEspace}</Link>
              <Link href={coursesHref} aria-current={isCoursesActive ? "page" : undefined} className={linkClass(isCoursesActive)}>{t.nav.cours}</Link>
              <Link href="/tableau-de-bord/messages" aria-current={isMessagesActive ? "page" : undefined} className={`flex items-center ${linkClass(isMessagesActive)}`}>
                {t.nav.messages}
                <UnreadBadge />
              </Link>
            </>
          )}
          {isAdmin && (
            <Link href="/admin" aria-current={isAdminActive ? "page" : undefined} className={`flex items-center ${linkClass(isAdminActive)}`}>
              {t.nav.espaceAdmin}
              <UnreadBadge />
            </Link>
          )}
          <Link href="/profil" aria-current={isProfilActive ? "page" : undefined} className={linkClass(isProfilActive)}>{t.nav.monProfil}</Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => signOutAndRedirect("/")}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-cream"
          >
            {t.nav.seDeconnecter}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            className="rounded-lg p-2.5 text-ink"
            onClick={() => setOpen((o) => !o)}
            aria-label={t.nav.menuToggle}
            aria-expanded={open}
            aria-controls="mobile-app-nav-menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-app-nav-menu" className="border-t border-secondary/25 bg-app-tint px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-sm font-medium text-ink-soft">
            {!isAdmin && (
              <>
                <Link href="/tableau-de-bord" onClick={() => setOpen(false)} aria-current={isDashboardActive ? "page" : undefined} className={isDashboardActive ? "text-primary" : ""}>{t.nav.monEspace}</Link>
                <Link href={coursesHref} onClick={() => setOpen(false)} aria-current={isCoursesActive ? "page" : undefined} className={isCoursesActive ? "text-primary" : ""}>{t.nav.cours}</Link>
                <Link href="/tableau-de-bord/messages" onClick={() => setOpen(false)} aria-current={isMessagesActive ? "page" : undefined} className={`flex items-center ${isMessagesActive ? "text-primary" : ""}`}>
                  {t.nav.messages}
                  <UnreadBadge />
                </Link>
              </>
            )}
            {isAdmin && (
              <Link href="/admin" onClick={() => setOpen(false)} aria-current={isAdminActive ? "page" : undefined} className={`flex items-center ${isAdminActive ? "text-primary" : ""}`}>
                {t.nav.espaceAdmin}
                <UnreadBadge />
              </Link>
            )}
            <Link href="/profil" onClick={() => setOpen(false)} aria-current={isProfilActive ? "page" : undefined} className={isProfilActive ? "text-primary" : ""}>{t.nav.monProfil}</Link>
            <button className="text-start" onClick={() => signOutAndRedirect("/")}>
              {t.nav.seDeconnecter}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
