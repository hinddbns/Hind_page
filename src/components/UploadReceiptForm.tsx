"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { site } from "@/lib/site";
import { useLocale } from "@/i18n/LocaleProvider";
import CopyButton from "@/components/CopyButton";

type ExistingRequest = {
  id: string;
  note: string | null;
  status: "PENDING" | "REJECTED";
};

export default function UploadReceiptForm({
  courseId,
  existing,
}: {
  courseId: string;
  existing?: ExistingRequest;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [done, setDone] = useState<"sent" | "updated" | "withdrawn" | null>(null);

  const isRejected = existing?.status === "REJECTED";
  const isEditing = !!existing && isRejected;

  const errorMessages: Record<string, string> = {
    not_authenticated: t.auth.genericError,
    invalid_request: t.auth.genericError,
    course_not_found: t.auth.genericError,
    already_approved: t.receipt.errorAlreadyApproved,
    already_pending: t.receipt.errorAlreadyPending,
    missing_file: t.receipt.missingFile,
    unsupported_format: t.receipt.errorUnsupportedFormat,
    file_too_large: t.receipt.errorFileTooLarge,
    not_found: t.auth.genericError,
    cannot_cancel_approved: t.receipt.errorAlreadyApproved,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file && !isEditing) {
      setError(t.receipt.missingFile);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("courseId", courseId);
    if (file) formData.append("receipt", file);
    if (note) formData.append("note", note);

    const res = await fetch("/api/enrollments", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(errorMessages[data.error] || t.auth.genericError);
      return;
    }

    setDone(isEditing ? "updated" : "sent");
    router.refresh();
  }

  async function handleWithdraw() {
    if (!existing) return;
    if (!window.confirm(t.receipt.confirmWithdraw)) return;

    setWithdrawing(true);
    setError(null);
    const res = await fetch(`/api/enrollments?id=${existing.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setWithdrawing(false);

    if (!res.ok) {
      setError(errorMessages[data.error] || t.auth.genericError);
      return;
    }

    setDone("withdrawn");
    router.refresh();
  }

  if (done === "sent") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl bg-success/10 px-5 py-4 text-sm text-success">
        <span aria-hidden className="mt-0.5">✓</span>
        <span>{t.receipt.sentTitle}</span>
      </div>
    );
  }
  if (done === "updated") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl bg-success/10 px-5 py-4 text-sm text-success">
        <span aria-hidden className="mt-0.5">✓</span>
        <span>{t.receipt.updatedNotice}</span>
      </div>
    );
  }
  if (done === "withdrawn") {
    return (
      <div role="status" className="rounded-xl bg-accent/10 px-5 py-4 text-sm text-ink">
        {t.receipt.withdrawnNotice}
      </div>
    );
  }

  // Locked, read-only view while the request is pending review — no re-upload allowed.
  if (existing && existing.status === "PENDING") {
    return (
      <div className="rounded-2xl border border-accent/40 bg-accent/10 p-6">
        <h3 className="font-serif text-lg text-ink">{t.receipt.pendingCardTitle}</h3>
        <p className="mt-2 text-sm text-ink">{t.receipt.pendingCardText}</p>

        {existing.note && (
          <p className="mt-3 rounded-lg bg-white/60 px-4 py-2 text-sm text-ink-soft">
            <span className="font-medium text-ink">{t.receipt.submittedNote}:</span> « {existing.note} »
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href={`/api/receipts/${existing.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink hover:border-primary hover:text-primary"
          >
            {t.receipt.viewReceipt}
          </a>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="rounded-full border border-danger/30 px-5 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-60"
          >
            {withdrawing ? t.receipt.withdrawing : t.receipt.withdraw}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary-light/50 bg-white p-6">
      <h3 className="font-serif text-lg text-ink">{isEditing ? t.receipt.editTitle : t.receipt.title}</h3>

      {isRejected && (
        <p className="mt-2 rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
          {t.receipt.rejectedNotice}
        </p>
      )}

      <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
        <dt className="font-medium text-ink">{t.receipt.bank}</dt>
        <dd className="flex items-center gap-1.5">
          {site.bankDetails.bank}
          <CopyButton value={site.bankDetails.bank} fieldLabel={t.receipt.bank} />
        </dd>
        <dt className="font-medium text-ink">{t.receipt.holder}</dt>
        <dd className="flex items-center gap-1.5">
          {site.bankDetails.holder}
          <CopyButton value={site.bankDetails.holder} fieldLabel={t.receipt.holder} />
        </dd>
        <dt className="font-medium text-ink">{t.receipt.rib}</dt>
        <dd className="flex items-center gap-1.5">
          {site.bankDetails.rib}
          <CopyButton value={site.bankDetails.rib} fieldLabel={t.receipt.rib} />
        </dd>
        <dt className="font-medium text-ink">{t.receipt.iban}</dt>
        <dd className="flex items-center gap-1.5">
          {site.bankDetails.iban}
          <CopyButton value={site.bankDetails.iban} fieldLabel={t.receipt.iban} />
        </dd>
      </dl>

      {isEditing && (
        <a
          href={`/api/receipts/${existing.id}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t.receipt.viewReceipt}
        </a>
      )}

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        <div>
          <label htmlFor="receipt-file" className="mb-1 block text-sm font-medium text-ink">
            {isEditing ? t.receipt.fileOptionalLabel : t.receipt.fileLabel}
          </label>
          <input
            id="receipt-file"
            type="file"
            required={!isEditing}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
          {isEditing && <p className="mt-1 text-xs text-ink-soft">{t.receipt.fileOptionalHint}</p>}
        </div>
        <div>
          <label htmlFor="receipt-note" className="mb-1 block text-sm font-medium text-ink">{t.receipt.noteLabel}</label>
          <textarea
            id="receipt-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-primary-dark disabled:opacity-60"
          >
            {loading ? (isEditing ? t.receipt.updating : t.receipt.sending) : isEditing ? t.receipt.updateBtn : t.receipt.send}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={loading || withdrawing}
              className="rounded-full border border-danger/30 px-5 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-60"
            >
              {withdrawing ? t.receipt.withdrawing : t.receipt.withdraw}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
