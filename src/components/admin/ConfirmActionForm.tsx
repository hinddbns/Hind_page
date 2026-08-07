"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/(app)/admin/actions";

function SubmitButton({
  label,
  pendingLabel,
  confirmMessage,
  className,
}: {
  label: string;
  pendingLabel: string;
  confirmMessage?: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-60`}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function ConfirmActionForm({
  action,
  confirmMessage,
  label,
  pendingLabel,
  className,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  confirmMessage?: string;
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction}>
      <SubmitButton
        label={label}
        pendingLabel={pendingLabel}
        confirmMessage={confirmMessage}
        className={className}
      />
      {state.error && (
        <p role="alert" className="mt-2 max-w-xs rounded-lg bg-danger/10 px-3 py-1.5 text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
