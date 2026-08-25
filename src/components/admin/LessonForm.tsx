"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ActionState } from "@/app/(app)/admin/actions";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToastActionState } from "@/lib/useToastActionState";
import FormSubmitButton from "@/components/admin/FormSubmitButton";

export default function LessonForm({
  action,
  mode,
  initial,
  defaultOpen = false,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  mode: "add" | "edit";
  initial?: { title: string; content: string; order: number; videoUrl: string | null };
  defaultOpen?: boolean;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();
  const successMessage = mode === "add" ? t.admin.lessonAdded : t.admin.lessonUpdated;
  const [state, formAction] = useToastActionState(action, successMessage, () => {
    if (mode === "add") {
      formRef.current?.reset();
    } else {
      setOpen(false);
    }
  });

  const fields = (
    <form
      key={initial ? JSON.stringify(initial) : mode}
      ref={formRef}
      id={`${uid}-fields`}
      action={formAction}
      className="mt-4 grid gap-3 sm:grid-cols-2"
    >
      <div>
        <label htmlFor={`${uid}-title`} className="mb-1 block text-sm font-medium text-ink">{t.admin.lessonTitleLabel}</label>
        <input
          id={`${uid}-title`}
          name="title"
          required
          defaultValue={initial?.title}
          className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor={`${uid}-order`} className="mb-1 block text-sm font-medium text-ink">{t.admin.order}</label>
        <input
          id={`${uid}-order`}
          name="order"
          type="number"
          defaultValue={initial?.order}
          className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor={`${uid}-video-file`} className="mb-1 block text-sm font-medium text-ink">{t.admin.videoFile}</label>
        <input
          id={`${uid}-video-file`}
          name="videoFile"
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
        />
        {mode === "edit" && <p className="mt-1 text-xs text-ink-soft">{t.admin.keepCurrentVideo}</p>}
      </div>
      <div>
        <label htmlFor={`${uid}-video-url`} className="mb-1 block text-sm font-medium text-ink">{t.admin.videoUrlLabel}</label>
        <input
          id={`${uid}-video-url`}
          name="videoUrl"
          type="url"
          placeholder="https://..."
          defaultValue={initial?.videoUrl ?? ""}
          className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${uid}-content`} className="mb-1 block text-sm font-medium text-ink">{t.admin.lessonContentLabel}</label>
        <textarea
          id={`${uid}-content`}
          name="content"
          required
          rows={4}
          defaultValue={initial?.content}
          className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-3">
        {state.error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{state.error}</p>
        )}
        <div>
          <FormSubmitButton
            label={mode === "add" ? t.admin.addLessonBtn : t.admin.editLessonBtn}
            pendingLabel={t.admin.saving}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream hover:bg-primary-dark"
          />
        </div>
      </div>
    </form>
  );

  if (mode === "add") return fields;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`${uid}-fields`}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
      >
        {t.admin.edit}
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && fields}
    </div>
  );
}
