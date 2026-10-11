import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/site";
import { getT } from "@/i18n/server";

// Deliberately bare: no Nav/Footer, no workspace links, no auth buttons — this page stands on
// its own. The root layout still supplies the RTL shell, fonts, WhatsApp button and toasts.
export default async function FreeCourseLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="px-6 pt-8">
        <Image
          src={site.logo}
          alt={site.name}
          width={site.logoWidth}
          height={site.logoHeight}
          priority
          className="mx-auto h-12 w-auto rounded-lg"
        />
      </header>
      <main className="flex-1 animate-shell-arrive">{children}</main>
      {/* pb-28 keeps the fixed WhatsApp button (bottom-6, h-14) clear of the footer text. */}
      <footer className="px-6 pb-28 pt-12 text-center text-xs text-ink-soft">
        <p className="[text-align-last:center]">
          © {new Date().getFullYear()} {site.name}. {t.footer.droitsReserves}
        </p>
        <Link href="/" className="mt-2 inline-block underline-offset-4 hover:text-primary hover:underline">
          {t.freeCourse.homeLink}
        </Link>
      </footer>
    </div>
  );
}
