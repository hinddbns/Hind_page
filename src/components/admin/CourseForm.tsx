"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ActionState } from "@/app/(app)/admin/actions";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToastActionState } from "@/lib/useToastActionState";
import FormSubmitButton from "@/components/admin/FormSubmitButton";

export default function CourseForm({
  action,
  mode,
  initial,
  defaultOpen = false,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  mode: "create" | "edit";
  initial?: {
    title: string;
    description: string;
    price: number;
    demoVideoUrl: string | null;
    audience?: "ADOLESCENT" | "PARENT_TEACHER";
  };
  defaultOpen?: boolean;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();
  const successMessage = mode === "create" ? t.admin.courseCreated : t.admin.courseUpdated;
  const [state, formAction] = useToastActionState(action, successMessage, () => {
    if (mode === "create") {
      formRef.current?.reset();
    } else {
      // Edit mode: collapse the panel back to its closed state now that
      // the save is confirmed by the server — never on validation/server
      // error, since this only runs when the action actually succeeded.
      setOpen(false);
    }
  });

  return (
    <div className="rounded-2xl border border-primary-light/50 bg-white p-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`${uid}-fields`}
        className="flex w-full items-center justify-between gap-2 rounded-lg text-start font-serif text-lg text-primary transition hover:text-primary-dark"
      >
        <span>{mode === "create" ? t.admin.addCourse : t.admin.editCourseTitle}</span>
        <ChevronDown
          aria-hidden
          className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <form
          key={initial ? JSON.stringify(initial) : "create"}
          ref={formRef}
          id={`${uid}-fields`}
          action={formAction}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <div>
            <label htmlFor={`${uid}-title`} className="mb-1 block text-sm font-medium text-ink">{t.admin.titleLabel}</label>
            <input
              id={`${uid}-title`}
              name="title"
              required
              defaultValue={initial?.title}
              className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {mode === "create" && (
            <div>
              <label htmlFor={`${uid}-slug`} className="mb-1 block text-sm font-medium text-ink">{t.admin.slugLabel}</label>
              <input
                id={`${uid}-slug`}
                name="slug"
                required
                pattern="[a-z0-9\-]+"
                placeholder="dawra-1"
                className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          <div>
            <label htmlFor={`${uid}-price`} className="mb-1 block text-sm font-medium text-ink">{t.admin.priceLabel}</label>
            <input
              id={`${uid}-price`}
              name="price"
              type="number"
              min={0}
              required
              defaultValue={initial?.price}
              className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor={`${uid}-audience`} className="mb-1 block text-sm font-medium text-ink">{t.admin.audienceLabel}</label>
            <select
              id={`${uid}-audience`}
              name="audience"
              defaultValue={initial?.audience ?? "PARENT_TEACHER"}
              className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="PARENT_TEACHER">{t.admin.audienceParentTeacher}</option>
              <option value="ADOLESCENT">{t.admin.audienceAdolescent}</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-description`} className="mb-1 block text-sm font-medium text-ink">{t.admin.descriptionLabel}</label>
            <textarea
              id={`${uid}-description`}
              name="description"
              required
              rows={4}
              defaultValue={initial?.description}
              className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor={`${uid}-demo-file`} className="mb-1 block text-sm font-medium text-ink">{t.admin.demoVideoLabel}</label>
            <input
              id={`${uid}-demo-file`}
              name="demoVideoFile"
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {mode === "edit" && <p className="mt-1 text-xs text-ink-soft">{t.admin.keepCurrentVideo}</p>}
          </div>

          <div>
            <label htmlFor={`${uid}-demo-url`} className="mb-1 block text-sm font-medium text-ink">{t.admin.demoVideoUrlLabel}</label>
            <input
              id={`${uid}-demo-url`}
              name="demoVideoUrl"
              type="url"
              placeholder="https://..."
              defaultValue={initial?.demoVideoUrl ?? ""}
              className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-3">
            {state.error && (
              <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{state.error}</p>
            )}
            <div>
              <FormSubmitButton
                label={mode === "create" ? t.admin.createCourseBtn : t.admin.updateCourseBtn}
                pendingLabel={t.admin.saving}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream hover:bg-primary-dark"
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
