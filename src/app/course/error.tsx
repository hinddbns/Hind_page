"use client";

import { useEffect } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

// Scoped to this route only (the app has no global error boundary): an unexpected failure such
// as the database being briefly unreachable gets a calm branded message instead of Next's
// default screen. The error itself is logged, never displayed, so nothing internal leaks.
export default function FreeCourseError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <h1 className="font-serif text-2xl text-ink">{t.errors.errorTitle}</h1>
      <p className="mt-3 text-sm text-ink-soft [text-align-last:center]">{t.errors.errorText}</p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-8 rounded-full bg-olive-dark px-6 py-3 text-sm font-medium text-cream shadow-lg shadow-olive/20 transition hover:opacity-90"
      >
        {t.errors.tryAgain}
      </button>
    </div>
  );
}
