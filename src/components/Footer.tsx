"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import { useLocale } from "@/i18n/LocaleProvider";
import SocialLinks from "./SocialLinks";

export default function Footer() {
  const { t } = useLocale();
  const pathname = usePathname();
  const variant = pathname?.startsWith("/ados") ? "ados" : "parents";

  return (
    <footer className="mt-auto border-t border-primary-light/40 bg-cream-dark">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink-soft">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <Image
            src={site.logo}
            alt={site.name}
            width={site.logoWidth}
            height={site.logoHeight}
            className="h-10 w-auto rounded-lg"
          />
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/ados" className="hover:text-primary">{t.nav.espaceAdos}</Link>
            <Link href="/parents-enseignants" className="hover:text-primary">{t.nav.espaceParents}</Link>
            <Link href="/connexion" className="hover:text-primary">{t.nav.connexion}</Link>
          </div>
          <SocialLinks variant={variant} />
        </div>
        <p className="mt-6 text-center text-xs text-ink-soft/70 md:text-start">
          © {new Date().getFullYear()} {site.name}. {t.footer.droitsReserves}
        </p>
      </div>
    </footer>
  );
}
