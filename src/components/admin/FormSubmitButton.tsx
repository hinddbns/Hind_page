"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export default function FormSubmitButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 ${className} disabled:opacity-60`}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {pending ? pendingLabel : label}
    </button>
  );
}
