"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { site } from "@/lib/site";
import { useLocale } from "@/i18n/LocaleProvider";
import UnreadBadge from "./UnreadBadge";

export default function Nav() {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-primary-light/40 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <Image
            src={site.logo}
            alt={site.name}
            width={site.logoWidth}
            height={site.logoHeight}
            priority
            className="h-12 w-auto rounded-lg"
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
          <Link href="/#a-propos" className="hover:text-primary">{t.nav.apropos}</Link>
          <Link href="/ados" className={`hover:text-primary ${pathname === "/ados" ? "text-primary" : ""}`}>{t.nav.espaceAdos}</Link>
          <Link href="/parents-enseignants" className={`hover:text-primary ${pathname === "/parents-enseignants" ? "text-primary" : ""}`}>{t.nav.espaceParents}</Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {status === "loading" ? null : session ? (
            <>
              {session.user.role !== "ADMIN" && (
                <Link href="/tableau-de-bord/messages" className="flex items-center text-sm font-medium text-ink-soft hover:text-primary">
                  {t.nav.messages}
                  <UnreadBadge />
                </Link>
              )}
              <Link
                href={session.user.role === "ADMIN" ? "/admin" : "/tableau-de-bord"}
                className="flex items-center text-sm font-medium text-ink-soft hover:text-primary"
              >
                {session.user.role === "ADMIN" ? t.nav.espaceAdmin : t.nav.monEspace}
                {session.user.role === "ADMIN" && <UnreadBadge />}
              </Link>
              <Link href="/profil" className="text-sm font-medium text-ink-soft hover:text-primary">
                {t.nav.monProfil}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-cream"
              >
                {t.nav.seDeconnecter}
              </button>
            </>
          ) : (
            <>
              <Link href="/connexion" className="text-sm font-medium text-ink-soft hover:text-primary">
                {t.nav.connexion}
              </Link>
              <Link
                href="/inscription"
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-cream transition hover:bg-primary-dark"
              >
                {t.nav.creerCompte}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            className="rounded-lg p-2.5 text-ink"
            onClick={() => setOpen((o) => !o)}
            aria-label={t.nav.menuToggle}
            aria-expanded={open}
            aria-controls="mobile-nav-menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav-menu" className="border-t border-primary-light/40 bg-cream px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-sm font-medium text-ink-soft">
            <Link href="/#a-propos" onClick={() => setOpen(false)}>{t.nav.apropos}</Link>
            <Link href="/ados" onClick={() => setOpen(false)} className={pathname === "/ados" ? "text-primary" : ""}>{t.nav.espaceAdos}</Link>
            <Link href="/parents-enseignants" onClick={() => setOpen(false)} className={pathname === "/parents-enseignants" ? "text-primary" : ""}>{t.nav.espaceParents}</Link>
            <hr className="border-primary-light/40" />
            {session ? (
              <>
                {session.user.role !== "ADMIN" && (
                  <Link href="/tableau-de-bord/messages" onClick={() => setOpen(false)} className="flex items-center">
                    {t.nav.messages}
                    <UnreadBadge />
                  </Link>
                )}
                <Link href={session.user.role === "ADMIN" ? "/admin" : "/tableau-de-bord"} onClick={() => setOpen(false)} className="flex items-center">
                  {session.user.role === "ADMIN" ? t.nav.espaceAdmin : t.nav.monEspace}
                  {session.user.role === "ADMIN" && <UnreadBadge />}
                </Link>
                <Link href="/profil" onClick={() => setOpen(false)}>{t.nav.monProfil}</Link>
                <button className="text-start" onClick={() => signOut({ callbackUrl: "/" })}>
                  {t.nav.seDeconnecter}
                </button>
              </>
            ) : (
              <>
                <Link href="/connexion" onClick={() => setOpen(false)}>{t.nav.connexion}</Link>
                <Link href="/inscription" onClick={() => setOpen(false)}>{t.nav.creerCompte}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
