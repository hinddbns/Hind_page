"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";

export default function ReceiptPreviewButton({ enrollmentId }: { enrollmentId: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const src = `/api/receipts/${enrollmentId}`;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, iframe, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function handleClose() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:border-primary hover:text-primary"
      >
        {t.admin.seeReceipt}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={handleClose}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.admin.seeReceipt}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-primary-light/40 px-5 py-3">
              <span className="font-medium text-ink">{t.admin.seeReceipt}</span>
              <div className="flex items-center gap-1">
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t.admin.openReceiptInNewTab}
                  className="rounded-lg p-1.5 text-ink-soft transition hover:bg-primary-light/30 hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={handleClose}
                  aria-label={t.admin.closeReceiptPreview}
                  className="rounded-lg p-1.5 text-ink-soft transition hover:bg-primary-light/30 hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe src={src} title={t.admin.seeReceipt} className="min-h-[70vh] flex-1 bg-cream-dark/40" />
          </div>
        </div>
      )}
    </>
  );
}
