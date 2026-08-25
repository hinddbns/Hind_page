"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/app/(app)/admin/actions";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToastActionState } from "@/lib/useToastActionState";
import ConfirmDialog from "@/components/ConfirmDialog";

function SubmitButton({
  label,
  pendingLabel,
  needsConfirm,
  onNeedsConfirm,
  className,
}: {
  label: string;
  pendingLabel: string;
  needsConfirm: boolean;
  onNeedsConfirm: () => void;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 ${className} disabled:opacity-60`}
      onClick={(e) => {
        if (needsConfirm) {
          e.preventDefault();
          onNeedsConfirm();
        }
      }}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function ConfirmActionForm({
  action,
  confirmMessage,
  successMessage,
  label,
  pendingLabel,
  className,
  children,
  onSuccess,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  confirmMessage?: string;
  /** Shown via the global toast on success. Defaults to a generic
   * "action succeeded" message if omitted — pass one specific to the
   * action (e.g. "تمت الموافقة على الطلب.") wherever possible. */
  successMessage?: string;
  label: string;
  pendingLabel: string;
  className: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
}) {
  const { t } = useLocale();
  const [state, formAction] = useToastActionState(action, successMessage ?? t.admin.actionSuccess);
  const [dialogOpen, setDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isDanger = className.includes("danger");

  useEffect(() => {
    if (state.ok) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction}>
      {children}
      <SubmitButton
        label={label}
        pendingLabel={pendingLabel}
        needsConfirm={!!confirmMessage}
        onNeedsConfirm={() => setDialogOpen(true)}
        className={className}
      />
      {state.error && (
        <p role="alert" className="mt-2 max-w-xs rounded-lg bg-danger/10 px-3 py-1.5 text-xs text-danger">
          {state.error}
        </p>
      )}
      {confirmMessage && (
        <ConfirmDialog
          open={dialogOpen}
          message={confirmMessage}
          danger={isDanger}
          onCancel={() => setDialogOpen(false)}
          onConfirm={() => {
            setDialogOpen(false);
            formRef.current?.requestSubmit();
          }}
        />
      )}
    </form>
  );
}
