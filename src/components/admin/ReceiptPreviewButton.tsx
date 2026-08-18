"use client";

import { useLocale } from "@/i18n/LocaleProvider";

export default function ReceiptPreviewButton({ enrollmentId }: { enrollmentId: string }) {
  const { t } = useLocale();

  return (
    <a
      href={`/api/receipts/${enrollmentId}`}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:border-primary hover:text-primary"
    >
      {t.admin.seeReceipt}
    </a>
  );
}
