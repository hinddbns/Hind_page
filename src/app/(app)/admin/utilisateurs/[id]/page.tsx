import Link from "next/link";
import { notFound } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { getT, interpolate } from "@/i18n/server";
import { demoteToUser, promoteToAdmin } from "../../actions";
import ConfirmActionForm from "@/components/admin/ConfirmActionForm";
import { getCourseProgressSummary } from "@/lib/lessonAccess";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-accent/40 bg-accent/10 text-ink",
  APPROVED: "border-success/30 bg-success/10 text-success",
  REJECTED: "border-danger/30 bg-danger/10 text-danger",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { t } = await getT();
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id },
    include: { enrollments: { include: { course: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!user) notFound();

  const isSelf = session?.user.id === user.id;

  const progressByEnrollmentId = new Map(
    await Promise.all(
      user.enrollments
        .filter((e) => e.status === "APPROVED")
        .map(async (e) => [e.id, await getCourseProgressSummary(e.courseId, user.id)] as const)
    )
  );

  const CATEGORY_LABEL: Record<string, string> = {
    MOTHER: t.auth.profileCategoryMother,
    TEACHER: t.auth.profileCategoryTeacher,
    ADOLESCENT: t.auth.profileCategoryAdolescent,
    OTHER: t.auth.profileCategoryOther,
  };

  const STATUS_LABEL: Record<string, string> = {
    PENDING: t.admin.statusPending,
    APPROVED: t.admin.statusApproved,
    REJECTED: t.admin.statusRejected,
  };

  return (
    <div>
      <Link href="/admin/utilisateurs" className="text-sm font-medium text-primary hover:underline">
        {t.admin.backToUsers}
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-ink">{user.name}</h1>

      <div className="mt-6 rounded-2xl border border-primary-light/50 bg-white p-6">
        <h2 className="font-serif text-lg text-ink">{t.admin.userInfo}</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-ink-soft">
          <dt className="font-medium text-ink">{t.admin.colEmail}</dt>
          <dd>{user.email}</dd>
          {user.phone && (
            <>
              <dt className="font-medium text-ink">{t.auth.phone}</dt>
              <dd>{user.phone}</dd>
            </>
          )}
          {user.dateOfBirth && (
            <>
              <dt className="font-medium text-ink">{t.auth.dateOfBirth}</dt>
              <dd>{user.dateOfBirth.toLocaleDateString("ar-MA")}</dd>
            </>
          )}
          {user.profileCategory && (
            <>
              <dt className="font-medium text-ink">{t.auth.profileCategory}</dt>
              <dd>{CATEGORY_LABEL[user.profileCategory]}</dd>
            </>
          )}
          <dt className="font-medium text-ink">{t.admin.colRole}</dt>
          <dd>{user.role === "ADMIN" ? t.profil.roleAdmin : t.profil.roleUser}</dd>
          <dt className="font-medium text-ink">{t.admin.colJoined}</dt>
          <dd>{user.createdAt.toLocaleDateString("ar-MA")}</dd>
        </dl>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/admin/messages/${user.id}`}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-cream"
          >
            {t.admin.seeConversation}
          </Link>
          {user.role === "USER" ? (
            <ConfirmActionForm
              action={promoteToAdmin.bind(null, user.id)}
              confirmMessage={t.admin.confirmPromote}
              label={t.admin.promoteToAdmin}
              pendingLabel={t.admin.saving}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:border-primary hover:text-primary"
            />
          ) : !isSelf ? (
            <ConfirmActionForm
              action={demoteToUser.bind(null, user.id)}
              confirmMessage={t.admin.confirmDemote}
              label={t.admin.demoteToUser}
              pendingLabel={t.admin.saving}
              className="rounded-full border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
            />
          ) : null}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-serif text-lg text-ink">{t.admin.userEnrollments}</h2>
        {user.enrollments.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">{t.admin.noEnrollmentsForUser}</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {user.enrollments.map((e) => {
              const progress = progressByEnrollmentId.get(e.id);
              return (
                <div
                  key={e.id}
                  className="flex flex-col gap-3 rounded-2xl border border-primary-light/50 bg-white p-5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-ink">{e.course.title}</p>
                    <p className="text-sm text-ink-soft">{formatPrice(e.course.price)}</p>

                    {progress && progress.totalLessons > 0 && (
                      <div className="mt-3 text-sm">
                        {progress.isComplete ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-success">
                            <PartyPopper className="h-4 w-4" aria-hidden />
                            {t.admin.progressCourseCompleted} — {interpolate(t.lessonContent.percentComplete, { percent: "100" })}
                          </span>
                        ) : (
                          <>
                            <p className="text-ink">
                              {interpolate(t.lessonContent.progressLabel, {
                                completed: String(progress.completedLessons),
                                total: String(progress.totalLessons),
                              })}{" "}
                              — {interpolate(t.lessonContent.percentComplete, { percent: String(progress.percent) })}
                            </p>
                            {progress.currentLessonTitle && (
                              <p className="mt-1 text-ink-soft">
                                {t.admin.progressCurrentLesson} {progress.currentLessonTitle}
                              </p>
                            )}
                          </>
                        )}
                        <p className="mt-1 text-xs text-ink-soft">
                          {t.admin.progressLastActivity}{" "}
                          {progress.lastActivityAt
                            ? progress.lastActivityAt.toLocaleDateString("ar-MA")
                            : t.admin.progressNoActivity}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[e.status]}`}
                    >
                      {STATUS_LABEL[e.status]}
                    </span>
                    {e.course.questionnaireEnabled && e.status === "APPROVED" && (
                      <Link
                        href={`/admin/cours/${e.course.id}/questionnaire/${user.id}`}
                        className="rounded-full border border-secondary/40 px-3 py-1 text-xs font-medium text-secondary hover:bg-secondary/10"
                      >
                        {t.admin.seeResponses}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
