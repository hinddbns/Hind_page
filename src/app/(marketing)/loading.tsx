import { Loader2 } from "lucide-react";
import { getT } from "@/i18n/server";

// Keeps the marketing nav/footer chrome in place during a page-to-page
// transition (the pages under `(marketing)/layout.tsx` fetch course lists and
// so suspend). Without a boundary at this level the transition would bubble
// to the root `loading.tsx` splash and replace the whole screen. Mirrors
// `(app)/loading.tsx` and `cours/loading.tsx`.
export default async function MarketingLoading() {
  const { t } = await getT();

  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
