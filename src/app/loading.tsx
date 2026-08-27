import { Loader2 } from "lucide-react";
import { site } from "@/lib/site";
import ar from "@/i18n/dictionaries/ar";

// Root-level Suspense fallback. Next.js renders this immediately while a
// route-group layout (e.g. `(app)/layout.tsx`, which awaits `getAppUser()`)
// resolves — the closest `loading.tsx` inside a group only covers that
// group's pages, never the group layout's own async work, so without this
// file the first navigation into an authenticated route shows a bare cream
// screen. Kept synchronous so the fallback paints with no await of its own.
export default function RootLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center"
    >
      <span className="font-serif text-2xl font-medium text-primary">{site.name}</span>
      <Loader2 className="h-5 w-5 animate-spin text-primary/50 motion-reduce:animate-none" />
      <span className="sr-only">{ar.common.loading}</span>
    </div>
  );
}
