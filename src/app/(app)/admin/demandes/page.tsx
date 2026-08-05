import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { getT } from "@/i18n/server";
import { reviewEnrollment } from "../actions";
import ConfirmActionForm from "@/components/admin/ConfirmActionForm";

export default async function AdminDemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  const { t } = await getT();
  const { audience: audienceParam } = await searchParams;
  const activeAudience = audienceParam === "ADOLESCENT" || audienceParam === "PARENT_TEACHER" ? audienceParam : undefined;

  const STATUS_LABEL: Record<string, string> = {
    PENDING: t.admin.statusPending,
    APPROVED: t.admin.statusApproved,
    REJECTED: t.admin.statusRejected,
  };

  const enrollments = await prisma.enrollment.findMany({
    where: activeAudience ? { course: { audience: activeAudience } } : undefined,
    include: { user: true, course: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  const tabs: { value: "ADOLESCENT" | "PARENT_TEACHER" | undefined; label: string }[] = [
    { value: undefined, label: t.admin.filterAll },
    { value: "PARENT_TEACHER", label: t.admin.audienceParentTeacher },
    { value: "ADOLESCENT", label: t.admin.audienceAdolescent },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">{t.admin.demandesTitle}</h1>
      <p className="mt-2 text-ink-soft">{t.admin.demandesSubtitle}</p>

      <div className="mt-6 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/demandes?audience=${tab.value}` : "/admin/demandes"}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeAudience === tab.value
                ? "border-primary bg-primary text-cream"
                : "border-primary-light text-ink-soft hover:border-primary hover:text-primary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {enrollments.length === 0 && (
          <p className="text-sm text-ink-soft">{t.admin.noRequests}</p>
        )}

        {enrollments.map((e) => (
          <div
            key={e.id}
            className="flex flex-col gap-4 rounded-2xl border border-primary-light/50 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
          >
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

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary-dark">
                {e.course.audience === "ADOLESCENT" ? t.admin.audienceAdolescent : t.admin.audienceParentTeacher}
              </span>
              <a
                href={`/api/receipts/${e.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:border-primary hover:text-primary"
              >
                {t.admin.seeReceipt}
              </a>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  e.status === "APPROVED"
                    ? "border-success/30 bg-success/10 text-success"
                    : e.status === "REJECTED"
                      ? "border-danger/30 bg-danger/10 text-danger"
                      : "border-accent/40 bg-accent/10 text-ink"
                }`}
              >
                {STATUS_LABEL[e.status]}
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
      </div>
    </div>
  );
}
