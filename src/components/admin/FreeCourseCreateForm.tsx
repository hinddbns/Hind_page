"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ActionState } from "@/app/(app)/admin/actions";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToastActionState } from "@/lib/useToastActionState";
import { FREE_COURSE_LIMITS } from "@/lib/freeCourseRules";
import { ACCESS_CODE_MAX_LENGTH } from "@/lib/freeCourseAccess";
import FormSubmitButton from "@/components/admin/FormSubmitButton";

const inputClass =
  "w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary";

// Controlled inputs so a refused code (taken, malformed) keeps what was typed. On success the
// action redirects to the new page's edit screen, which is the confirmation.
export default function FreeCourseCreateForm({
  action,
  defaultOpen = false,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultOpen?: boolean;
}) {
  const { t } = useLocale();
  const f = t.freeCourseAdmin;
  const uid = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [state, formAction] = useToastActionState(action);

  return (
    <div className="rounded-2xl border border-primary-light/50 bg-white p-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`${uid}-fields`}
        className="flex w-full items-center justify-between gap-2 rounded-lg text-start font-serif text-lg text-primary transition hover:text-primary-dark"
      >
        <span>{f.createTitle}</span>
        <ChevronDown aria-hidden className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form id={`${uid}-fields`} action={formAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <p className="text-sm text-ink-soft md:col-span-2">{f.createHint}</p>
          <div>
            <label htmlFor={`${uid}-title`} className="mb-1 block text-sm font-medium text-ink">
              {f.titleLabel} <span className="font-normal text-ink-soft">({f.required})</span>
            </label>
            <input
              id={`${uid}-title`}
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={FREE_COURSE_LIMITS.title}
              placeholder={f.createTitlePlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-access-code`} className="mb-1 block text-sm font-medium text-ink">
              {f.accessCodeLabel} <span className="font-normal text-ink-soft">({f.required})</span>
            </label>
            <input
              id={`${uid}-access-code`}
              name="accessCode"
              required
              dir="ltr"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              maxLength={ACCESS_CODE_MAX_LENGTH}
              placeholder="day2"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={`${uid}-access-code-hint`}
              className={inputClass}
            />
            <p id={`${uid}-access-code-hint`} className="mt-1 text-xs text-ink-soft">{f.accessCodeHint}</p>
          </div>

          <div className="flex flex-col gap-3 md:col-span-2">
            {state.error && (
              <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{state.error}</p>
            )}
            <div>
              <FormSubmitButton
                label={f.createBtn}
                pendingLabel={f.creating}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream hover:bg-primary-dark"
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
