"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/(app)/admin/actions";
import { useLocale } from "@/i18n/LocaleProvider";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function SettingsForm({
  action,
  initialAvailability,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialAvailability: string;
}) {
  const { t } = useLocale();
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 flex max-w-xl flex-col gap-4">
      <div>
        <label htmlFor="settings-availability" className="mb-1 block text-sm font-medium text-ink">{t.admin.availabilityLabel}</label>
        <input
          id="settings-availability"
          name="availability"
          defaultValue={initialAvailability}
          className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state.ok && (
        <p role="status" className="rounded-lg bg-success/10 px-4 py-2 text-sm text-success">{t.admin.saved}</p>
      )}
      <SubmitButton label={t.admin.save} pendingLabel={t.admin.saving} />
    </form>
  );
}
