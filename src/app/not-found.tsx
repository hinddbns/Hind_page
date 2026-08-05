import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/site";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getT();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <Image
        src={site.logo}
        alt={site.name}
        width={site.logoWidth}
        height={site.logoHeight}
        className="h-20 w-auto rounded-2xl"
      />
      <p className="mt-6 font-serif text-5xl text-primary-light">404</p>
      <h1 className="mt-2 font-serif text-2xl text-ink">{t.errors.notFoundTitle}</h1>
      <p className="mt-3 text-sm text-ink-soft">{t.errors.notFoundText}</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-medium text-cream transition hover:bg-primary-dark"
      >
        {t.errors.backHome}
      </Link>
    </div>
  );
}
