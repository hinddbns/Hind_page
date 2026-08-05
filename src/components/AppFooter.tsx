import Image from "next/image";
import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { site } from "@/lib/site";
import SocialLinks from "./SocialLinks";

export default async function AppFooter() {
  const { t } = await getT();
  const session = await auth();
  const variant = session?.user.workspace === "ADOLESCENT" ? "ados" : "parents";

  return (
    <footer className="mt-auto border-t border-secondary/25 bg-app-tint px-6 py-5">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-xs text-ink-soft sm:flex-row sm:justify-between">
        <Image
          src={site.logo}
          alt={site.name}
          width={site.logoWidth}
          height={site.logoHeight}
          className="h-8 w-auto rounded-md"
        />
        <span>{t.common.followUs}</span>
        <SocialLinks variant={variant} />
      </div>
    </footer>
  );
}
