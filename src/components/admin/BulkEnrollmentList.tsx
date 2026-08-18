"use client";

import { useState } from "react";
import type { Prisma } from "@prisma/client";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import { interpolate } from "@/i18n/config";
import { formatPrice } from "@/lib/format";
import { reviewEnrollment, reviewEnrollmentsBulk } from "@/app/(app)/admin/actions";
import ConfirmActionForm from "@/components/admin/ConfirmActionForm";
import ReceiptPreviewButton from "@/components/admin/ReceiptPreviewButton";

type EnrollmentRow = Prisma.EnrollmentGetPayload<{ include: { user: true; course: true } }>;

export default function BulkEnrollmentList({
  t,
  enrollments,
  statusLabel,
}: {
  t: Dictionary;
  enrollments: EnrollmentRow[];
  statusLabel: Record<string, string>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedIds = Array.from(selected).filter((id) => enrollments.some((e) => e.id === id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === enrollments.length ? new Set() : new Set(enrollments.map((e) => e.id))));
  }

  return (
    <div className="flex flex-col gap-4">
      {enrollments.length > 0 && (
        <label className="flex w-fit items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={selected.size === enrollments.length}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-primary-light accent-primary"
          />
          {t.admin.selectAll}
        </label>
      )}

      {enrollments.map((e) => (
        <div
          key={e.id}
          className="flex flex-col gap-4 rounded-2xl border border-primary-light/50 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected.has(e.id)}
              onChange={() => toggle(e.id)}
              aria-label={e.user.name}
              className="mt-1 h-4 w-4 shrink-0 rounded border-primary-light accent-primary"
            />
            <div>
              <p className="font-medium text-ink">
                {e.user.name} <span className="font-normal text-ink-soft">— {e.user.email}</span>
              </p>
              <p className="text-sm text-ink-soft">
                {e.course.title} · {formatPrice(e.course.price)}
              </p>
              {e.receiptNote && (
                <p className="mt-1 text-xs italic text-ink-soft">« {e.receiptNote} »</p>
              )}
              <p className="mt-1 text-xs text-ink-soft/70">
                {t.admin.requestedOn} {e.createdAt.toLocaleDateString("ar")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary-dark">
              {e.course.audience === "ADOLESCENT" ? t.admin.audienceAdolescent : t.admin.audienceParentTeacher}
            </span>
            <ReceiptPreviewButton enrollmentId={e.id} />

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                e.status === "APPROVED"
                  ? "border-success/30 bg-success/10 text-success"
                  : e.status === "REJECTED"
                    ? "border-danger/30 bg-danger/10 text-danger"
                    : "border-accent/40 bg-accent/10 text-ink"
              }`}
            >
              {statusLabel[e.status]}
            </span>

            {e.status !== "APPROVED" && (
              <ConfirmActionForm
                action={reviewEnrollment.bind(null, e.id, "APPROVED")}
                confirmMessage={t.admin.confirmApprove}
                label={t.admin.approve}
                pendingLabel={t.admin.saving}
                className="rounded-full bg-success px-4 py-2 text-sm font-medium text-cream hover:opacity-90"
              />
            )}
            {e.status !== "REJECTED" && (
              <ConfirmActionForm
                action={reviewEnrollment.bind(null, e.id, "REJECTED")}
                confirmMessage={t.admin.confirmReject}
                label={t.admin.reject}
                pendingLabel={t.admin.saving}
                className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-cream hover:opacity-90"
              />
            )}
          </div>
        </div>
      ))}

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-primary-light/50 bg-white p-4 shadow-lg">
          <span className="text-sm font-medium text-ink">
            {interpolate(t.admin.selectedCount, { n: String(selectedIds.length) })}
          </span>
          <ConfirmActionForm
            action={reviewEnrollmentsBulk.bind(null, "APPROVED")}
            confirmMessage={interpolate(t.admin.confirmBulkApprove, { n: String(selectedIds.length) })}
            label={t.admin.bulkApprove}
            pendingLabel={t.admin.saving}
            className="rounded-full bg-success px-4 py-2 text-sm font-medium text-cream hover:opacity-90"
            onSuccess={() => setSelected(new Set())}
          >
            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="ids" value={id} />
            ))}
          </ConfirmActionForm>
          <ConfirmActionForm
            action={reviewEnrollmentsBulk.bind(null, "REJECTED")}
            confirmMessage={interpolate(t.admin.confirmBulkReject, { n: String(selectedIds.length) })}
            label={t.admin.bulkReject}
            pendingLabel={t.admin.saving}
            className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-cream hover:opacity-90"
            onSuccess={() => setSelected(new Set())}
          >
            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="ids" value={id} />
            ))}
          </ConfirmActionForm>
        </div>
      )}
    </div>
  );
}
