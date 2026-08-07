"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";
import { interpolate } from "@/i18n/config";

export default function CopyButton({ value, fieldLabel }: { value: string; fieldLabel: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — button is a harmless no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={interpolate(t.common.copyFieldLabel, { field: fieldLabel })}
      className="inline-flex items-center rounded-md p-1 text-ink-soft transition hover:bg-primary-light/30 hover:text-primary"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      <span role="status" className="sr-only">{copied ? t.common.copied : ""}</span>
    </button>
  );
}
