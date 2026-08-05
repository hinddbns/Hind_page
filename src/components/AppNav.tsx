"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { site } from "@/lib/site";
import { useLocale } from "@/i18n/LocaleProvider";
import UnreadBadge from "./UnreadBadge";

export default function AppNav() {
  const { data: session } = useSession();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const isAdmin = session?.user.role === "ADMIN";
  const homeHref = isAdmin ? "/admin" : "/tableau-de-bord";
  const isAdosWorkspace = !isAdmin && session?.user.workspace === "ADOLESCENT";
  const coursesHref = isAdosWorkspace ? "/ados" : "/parents-enseignants";

  return (
    <header className="sticky top-0 z-50 border-b border-secondary/25 bg-app-tint/95 backdrop-blur">
      <div
        className={`h-[3px] ${
          isAdosWorkspace
            ? "bg-gradient-to-l from-accent via-secondary-light to-secondary"
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
              <Link href="/tableau-de-bord" className="hover:text-primary">{t.nav.monEspace}</Link>
              <Link href={coursesHref} className="hover:text-primary">{t.nav.cours}</Link>
              <Link href="/tableau-de-bord/messages" className="flex items-center hover:text-primary">
                {t.nav.messages}
                <UnreadBadge />
              </Link>
            </>
          )}
          {isAdmin && (
            <Link href="/admin" className="flex items-center hover:text-primary">
              {t.nav.espaceAdmin}
              <UnreadBadge />
            </Link>
          )}
          <Link href="/profil" className="hover:text-primary">{t.nav.monProfil}</Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-cream"
          >
            {t.nav.seDeconnecter}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button className="text-ink" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-secondary/25 bg-app-tint px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-sm font-medium text-ink-soft">
            {!isAdmin && (
              <>
                <Link href="/tableau-de-bord" onClick={() => setOpen(false)}>{t.nav.monEspace}</Link>
                <Link href={coursesHref} onClick={() => setOpen(false)}>{t.nav.cours}</Link>
                <Link href="/tableau-de-bord/messages" onClick={() => setOpen(false)} className="flex items-center">
                  {t.nav.messages}
                  <UnreadBadge />
                </Link>
              </>
            )}
            {isAdmin && (
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center">
                {t.nav.espaceAdmin}
                <UnreadBadge />
              </Link>
            )}
            <Link href="/profil" onClick={() => setOpen(false)}>{t.nav.monProfil}</Link>
            <button className="text-left" onClick={() => signOut({ callbackUrl: "/" })}>
              {t.nav.seDeconnecter}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
