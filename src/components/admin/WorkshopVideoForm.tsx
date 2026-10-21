"use client";

import { useId, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { ActionState } from "@/app/(app)/admin/actions";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToastActionState } from "@/lib/useToastActionState";
import FormSubmitButton from "@/components/admin/FormSubmitButton";

export default function WorkshopVideoForm({
  action,
  pagePath,
  initialReference,
  initialPublished,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  pagePath: string;
  initialReference: string;
  initialPublished: boolean;
}) {
  const { t } = useLocale();
  const uid = useId();
  const [state, formAction] = useToastActionState(action, t.admin.workshopVideoSaved);
  // Controlled so a failed save keeps what the admin typed (React resets uncontrolled forms).
  const [reference, setReference] = useState(initialReference);
  const [published, setPublished] = useState(initialPublished);

  return (
    <form action={formAction} className="mt-10 flex max-w-xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg text-ink">{t.admin.workshopVideoTitle}</h2>
        <a
          href={pagePath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t.admin.workshopVideoViewPage}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      <div>
        <label htmlFor={`${uid}-reference`} className="mb-1 block text-sm font-medium text-ink">
          {t.admin.workshopVideoReferenceLabel}
        </label>
        <input
          id={`${uid}-reference`}
          name="bunnyReference"
          dir="ltr"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          aria-describedby={`${uid}-hint`}
          placeholder="https://iframe.mediadelivery.net/embed/…"
          className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <p id={`${uid}-hint`} className="mt-1 text-xs text-ink-soft">{t.admin.workshopVideoHint}</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="published"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        {t.admin.workshopVideoPublishedLabel}
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{state.error}</p>
      )}
      <FormSubmitButton
        label={t.admin.save}
        pendingLabel={t.admin.saving}
        className="mt-1 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream hover:bg-primary-dark"
      />
    </form>
  );
}
