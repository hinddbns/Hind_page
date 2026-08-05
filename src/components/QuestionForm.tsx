"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale } from "@/i18n/LocaleProvider";
import { interpolate } from "@/i18n/config";
import type { ActionState } from "@/app/(app)/admin/actions";

type QuestionType = "OPEN" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SCALE";

type InitialOption = { label: string };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function QuestionForm({
  action,
  mode,
  submitLabel,
  initialType = "OPEN",
  initialText = "",
  initialOrder = 1,
  initialOptions = [],
  initialScaleMin = 1,
  initialScaleMax = 5,
  initialScaleMinLabel = "",
  initialScaleMaxLabel = "",
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  mode: "add" | "edit";
  submitLabel: string;
  initialType?: QuestionType;
  initialText?: string;
  initialOrder?: number;
  initialOptions?: InitialOption[];
  initialScaleMin?: number;
  initialScaleMax?: number;
  initialScaleMinLabel?: string;
  initialScaleMaxLabel?: string;
}) {
  const { t } = useLocale();
  const [type, setType] = useState<QuestionType>(initialType);
  const [state, formAction] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  useEffect(() => {
    if (state.ok && mode === "add") {
      formRef.current?.reset();
    }
  }, [state.ok, mode]);

  const [open, setOpen] = useState(mode === "add");

  const isChoice = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
  const isScale = type === "SCALE";
  const optionSlots = [1, 2, 3, 4, 5, 6];

  const typeOptions: { value: QuestionType; label: string }[] = [
    { value: "OPEN", label: t.admin.typeOpen },
    { value: "SINGLE_CHOICE", label: t.admin.typeSingle },
    { value: "MULTIPLE_CHOICE", label: t.admin.typeMultiple },
    { value: "SCALE", label: t.admin.typeScale },
  ];

  if (mode === "edit" && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm font-medium text-primary">
        {t.admin.edit}
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${uid}-type`} className="mb-1 block text-sm font-medium text-ink">{t.admin.questionType}</label>
        <select
          id={`${uid}-type`}
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`${uid}-text`} className="mb-1 block text-sm font-medium text-ink">{t.admin.questionText}</label>
        <textarea
          id={`${uid}-text`}
          name="text"
          required
          rows={2}
          defaultValue={initialText}
          className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor={`${uid}-order`} className="mb-1 block text-sm font-medium text-ink">{t.admin.questionOrder}</label>
        <input
          id={`${uid}-order`}
          name="order"
          type="number"
          defaultValue={initialOrder}
          className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {isChoice && (
        <div className="sm:col-span-2 rounded-xl border border-primary-light/40 bg-cream-dark/30 p-4">
          <p className="text-xs text-ink-soft">{t.admin.optionsHint}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {optionSlots.map((n) => {
              const label = interpolate(t.admin.optionLabel, { n: String(n) });
              return (
                <input
                  key={n}
                  name={`option${n}`}
                  aria-label={label}
                  placeholder={label}
                  defaultValue={initialOptions[n - 1]?.label ?? ""}
                  className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                />
              );
            })}
          </div>
        </div>
      )}

      {isScale && (
        <div className="sm:col-span-2 grid gap-3 rounded-xl border border-primary-light/40 bg-cream-dark/30 p-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-scale-min`} className="mb-1 block text-sm font-medium text-ink">{t.admin.scaleMin}</label>
            <input
              id={`${uid}-scale-min`}
              name="scaleMin"
              type="number"
              defaultValue={initialScaleMin}
              className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-scale-max`} className="mb-1 block text-sm font-medium text-ink">{t.admin.scaleMax}</label>
            <input
              id={`${uid}-scale-max`}
              name="scaleMax"
              type="number"
              defaultValue={initialScaleMax}
              className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-scale-min-label`} className="mb-1 block text-sm font-medium text-ink">{t.admin.scaleMinLabel}</label>
            <input
              id={`${uid}-scale-min-label`}
              name="scaleMinLabel"
              defaultValue={initialScaleMinLabel}
              className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-scale-max-label`} className="mb-1 block text-sm font-medium text-ink">{t.admin.scaleMaxLabel}</label>
            <input
              id={`${uid}-scale-max-label`}
              name="scaleMaxLabel"
              defaultValue={initialScaleMaxLabel}
              className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      <div className="sm:col-span-2 flex flex-col gap-3">
        {state.error && (
          <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{state.error}</p>
        )}
        {state.ok && (
          <p className="rounded-lg bg-success/10 px-4 py-2 text-sm text-success">
            {mode === "add" ? t.admin.questionAdded : t.admin.questionUpdated}
          </p>
        )}
        <div>
          <SubmitButton label={submitLabel} pendingLabel={t.admin.saving} />
        </div>
      </div>
    </form>
  );
}
