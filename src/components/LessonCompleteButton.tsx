"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";

export default function LessonCompleteButton({ lessonId }: { lessonId: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setPending(true);
    setError(false);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "complete" }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError(true);
        setPending(false);
      }
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-primary-dark disabled:opacity-60"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        {pending ? t.lessonContent.markCompletePending : t.lessonContent.markComplete}
      </button>
      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs text-danger">
          {t.lessonContent.markCompleteError}
        </p>
      )}
    </div>
  );
}
