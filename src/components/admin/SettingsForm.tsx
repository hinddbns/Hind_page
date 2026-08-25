"use client";

import type { ActionState } from "@/app/(app)/admin/actions";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToastActionState } from "@/lib/useToastActionState";
import FormSubmitButton from "@/components/admin/FormSubmitButton";

export default function SettingsForm({
  action,
  initialAvailability,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialAvailability: string;
}) {
  const { t } = useLocale();
  const [state, formAction] = useToastActionState(action, t.admin.saved);

  return (
    <form action={formAction} className="mt-8 flex max-w-xl flex-col gap-4">
      <div>
        <label htmlFor="settings-availability" className="mb-1 block text-sm font-medium text-ink">{t.admin.availabilityLabel}</label>
        <input
          id="settings-availability"
          key={initialAvailability}
          name="availability"
          defaultValue={initialAvailability}
          className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
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
