import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/i18n/server";
import { site } from "@/lib/site";
import { fetchFreeCourse } from "@/lib/freeCourse";
import { FREE_COURSE_ADMIN_PATH, freeCoursePath, getAccessLinkStatus } from "@/lib/freeCourseAccess";
import { getFreeCourseVideo, getPublishBlockers, type FreeCoursePublishBlocker } from "@/lib/freeCourseRules";
import { buildYouTubeWatchUrl } from "@/lib/youtube";
import { setFreeCoursePublished, updateFreeCourse } from "../../actions";
import { absoluteUrl } from "../absoluteUrl";
import ConfirmActionForm from "@/components/admin/ConfirmActionForm";
import FreeCourseForm from "@/components/admin/FreeCourseForm";
import CopyButton from "@/components/CopyButton";

export default async function AdminFreeCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const f = t.freeCourseAdmin;
  const course = await fetchFreeCourse(id);
  if (!course) notFound();

  // `?? null` keeps the page working if the group-link migration hasn't been applied yet.
  const accessCode = course.accessCode ?? null;
  const accessExpiresOn = course.accessExpiresOn ?? null;
  const linkStatus = getAccessLinkStatus({ accessCode, accessExpiresOn }, accessCode ?? "", new Date());
  // Previews go through the page's own public address: there is no way in by id.
  const previewPath = accessCode ? freeCoursePath(accessCode) : null;
  const url = accessCode ? await absoluteUrl(freeCoursePath(accessCode)) : null;
  const published = course.published;
  const blockers = getPublishBlockers(course);
  const blockerLabels: Record<FreeCoursePublishBlocker, string> = {
    titleRequired: f.blockerTitleRequired,
    introductionRequired: f.blockerIntroductionRequired,
    videoRequired: f.blockerVideoRequired,
    accessCodeRequired: f.blockerAccessCodeRequired,
  };
  const savedVideo = getFreeCourseVideo(course);

  return (
    <div>
      <Link href={FREE_COURSE_ADMIN_PATH} className="text-sm font-medium text-primary hover:underline">
        {f.backToList}
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-ink">{course.title || f.editLink}</h1>
      {course.eyebrow && <p className="mt-2 text-sm text-ink-soft">{course.eyebrow}</p>}

      <section aria-labelledby="free-course-status" className="mt-6 rounded-2xl border border-primary-light/50 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="free-course-status" className="font-serif text-lg text-ink">{f.statusTitle}</h2>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              published ? "border-success/30 bg-success/10 text-success" : "border-ink/15 bg-ink/5 text-ink-soft"
            }`}
          >
            {published ? t.admin.published : t.admin.draft}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-ink">{f.accessLinkLabel}:</span>
          {url ? (
            <>
              <code dir="ltr" className="rounded-md bg-cream-dark/60 px-2 py-0.5 text-xs text-ink-soft">{url}</code>
              <CopyButton value={url} fieldLabel={f.accessLinkLabel} />
            </>
          ) : null}
          <span
            className={`rounded-full border px-3 py-0.5 text-xs font-medium ${
              linkStatus === "open" && published
                ? "border-success/30 bg-success/10 text-success"
                : linkStatus === "expired"
                  ? "border-danger/30 bg-danger/10 text-danger"
                  : "border-ink/15 bg-ink/5 text-ink-soft"
            }`}
          >
            {linkStatus === "open" ? f.accessStatusOpen : linkStatus === "expired" ? f.accessStatusExpired : f.accessStatusNoCode}
            {linkStatus === "open" && accessExpiresOn ? <bdi dir="ltr"> · {accessExpiresOn}</bdi> : null}
          </span>
        </div>
        {linkStatus === "open" && !published && <p className="mt-2 text-xs text-ink-soft">{f.accessNotPublished}</p>}

        <div className="mt-4 flex flex-wrap items-start gap-3">
          {previewPath && (
            <Link
              href={previewPath}
              target="_blank"
              rel="noopener"
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:border-primary hover:text-primary"
            >
              {published ? f.viewLink : f.previewLink}
            </Link>
          )}

          {published ? (
            <ConfirmActionForm
              action={setFreeCoursePublished.bind(null, course.id, false)}
              confirmMessage={f.confirmUnpublish}
              successMessage={f.unpublishedSuccess}
              label={t.admin.unpublish}
              pendingLabel={t.admin.saving}
              className="rounded-full border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
            />
          ) : (
            blockers.length === 0 && (
              <ConfirmActionForm
                action={setFreeCoursePublished.bind(null, course.id, true)}
                confirmMessage={f.confirmPublish}
                successMessage={f.publishedSuccess}
                label={t.admin.publish}
                pendingLabel={t.admin.saving}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-cream hover:bg-primary-dark"
              />
            )
          )}
        </div>

        {!published && blockers.length > 0 && (
          <div role="note" className="mt-4 rounded-lg bg-cream-dark/60 px-4 py-3 text-sm text-ink-soft">
            <p className="font-medium text-ink">{f.publishBlockedTitle}</p>
            <ul className="mt-1 list-inside list-disc">
              {blockers.map((blocker) => (
                <li key={blocker}>{blockerLabels[blocker]}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs text-ink-soft">
          {f.previewHint} {!published && blockers.length === 0 && f.publishUsesSaved}
        </p>
      </section>

      <FreeCourseForm
        key={`${course.id}-${course.updatedAt}`}
        action={updateFreeCourse.bind(null, course.id)}
        updatedAt={course.updatedAt}
        published={published}
        hostName={site.name}
        hostRole={site.tagline}
        savedVideo={savedVideo}
        initial={{
          title: course.title,
          eyebrow: course.eyebrow ?? "",
          introduction: course.introduction,
          // A saved YouTube video is shown as its watch URL, which re-saves to the same ID.
          videoReference:
            savedVideo?.provider === "youtube" ? buildYouTubeWatchUrl(savedVideo.videoId) : (course.bunnyVideoId ?? ""),
          bunnyLibraryId: course.bunnyLibraryId ?? "",
          videoAspect: course.videoAspect,
          // `?? true` keeps the page working if the column migration hasn't been applied yet.
          allowSkipping: course.allowSkipping ?? true,
          showHost: course.showHost,
          hostIntro: course.hostIntro ?? "",
          seoTitle: course.seoTitle ?? "",
          seoDescription: course.seoDescription ?? "",
          accessCode: accessCode ?? "",
          accessExpiresOn: accessExpiresOn ?? "",
        }}
      />
    </div>
  );
}
