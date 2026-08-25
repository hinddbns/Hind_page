"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { subscribeToasts, dismissToast, type ToastItem, type ToastVariant } from "@/lib/toast";
import { useLocale } from "@/i18n/LocaleProvider";

const ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const ICON_COLOR: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-primary",
};

const BORDER_COLOR: Record<ToastVariant, string> = {
  success: "border-success/30",
  error: "border-danger/30",
  info: "border-primary-light",
};

export default function ToastViewport() {
  const { t } = useLocale();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    // Deliberately physical `right`/`bottom` (not logical end/bottom) — this
    // corner is fixed screen chrome, kept opposite WhatsAppButton's `end-6`
    // (which resolves to the visual left in this RTL app) regardless of
    // reading direction, matching the app-wide convention that toasts live
    // at the bottom-right. Content inside each card still flows naturally
    // RTL (Arabic text right-aligns on its own, dismiss button uses ms-*).
    <div
      className="fixed bottom-6 right-6 z-[60] flex w-[calc(100%-3rem)] max-w-sm flex-col gap-2.5"
      dir="rtl"
    >
      {toasts.map((item) => {
        const Icon = ICON[item.variant];
        return (
          <div
            key={item.id}
            role={item.variant === "error" ? "alert" : "status"}
            className={`animate-toast-in flex items-start gap-2.5 rounded-2xl border ${BORDER_COLOR[item.variant]} bg-white p-4 text-sm text-ink shadow-lg shadow-black/10`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_COLOR[item.variant]}`} aria-hidden />
            <p className="flex-1">{item.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label={t.common.dismiss}
              className="ms-1 shrink-0 rounded-md p-1 text-ink-soft transition hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
