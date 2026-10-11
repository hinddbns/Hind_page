import Link from "next/link";
import { headers } from "next/headers";
import { getT } from "@/i18n/server";
import { site } from "@/lib/site";
import { getSiteUrl } from "@/lib/siteUrl";
import { FREE_COURSE_PATH, fetchFreeCourse } from "@/lib/freeCourse";
import { getPublishBlockers, type FreeCoursePublishBlocker } from "@/lib/freeCourseRules";
import { setFreeCoursePublished, updateFreeCourse } from "../actions";
import ConfirmActionForm from "@/components/admin/ConfirmActionForm";
import FreeCourseForm from "@/components/admin/FreeCourseForm";
import CopyButton from "@/components/CopyButton";

async function publicUrl() {
  const siteUrl = getSiteUrl();
  if (siteUrl) return new URL(FREE_COURSE_PATH, siteUrl).href;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return FREE_COURSE_PATH;
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${FREE_COURSE_PATH}`;
}

export default async function AdminFreeCoursePage() {
  const { t } = await getT();
  const f = t.freeCourseAdmin;
  const course = await fetchFreeCourse();
  const url = await publicUrl();

  const content = course ?? {
    title: "",
    eyebrow: null,
    introduction: "",
    bunnyLibraryId: null,
    bunnyVideoId: null,
    videoAspect: "LANDSCAPE" as const,
    showHost: true,
    hostIntro: null,
    seoTitle: null,
    seoDescription: null,
    indexable: false,
  };
  const published = course?.published ?? false;
  const blockers = getPublishBlockers(content);
  const blockerLabels: Record<FreeCoursePublishBlocker, string> = {
    titleRequired: f.blockerTitleRequired,
    introductionRequired: f.blockerIntroductionRequired,
    videoRequired: f.blockerVideoRequired,
  };
  const savedVideo =
    content.bunnyLibraryId && content.bunnyVideoId
      ? { libraryId: content.bunnyLibraryId, videoId: content.bunnyVideoId }
      : null;

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">{f.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">{f.subtitle}</p>

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
          <span className="font-medium text-ink">{f.publicUrlLabel}:</span>
          <code dir="ltr" className="rounded-md bg-cream-dark/60 px-2 py-0.5 text-xs text-ink-soft">{url}</code>
          <CopyButton value={url} fieldLabel={f.publicUrlLabel} />
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-3">
          <Link
            href={FREE_COURSE_PATH}
            target="_blank"
            rel="noopener"
            className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:border-primary hover:text-primary"
          >
            {published ? f.viewLink : f.previewLink}
          </Link>

          {published ? (
            <ConfirmActionForm
              action={setFreeCoursePublished.bind(null, false)}
              confirmMessage={f.confirmUnpublish}
              successMessage={f.unpublishedSuccess}
              label={t.admin.unpublish}
              pendingLabel={t.admin.saving}
              className="rounded-full border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
            />
          ) : (
            blockers.length === 0 && (
              <ConfirmActionForm
                action={setFreeCoursePublished.bind(null, true)}
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
        key={course?.updatedAt ?? "new"}
        action={updateFreeCourse}
        updatedAt={course?.updatedAt ?? ""}
        published={published}
        hostName={site.name}
        hostRole={site.tagline}
        savedVideo={savedVideo}
        initial={{
          title: content.title,
          eyebrow: content.eyebrow ?? "",
          introduction: content.introduction,
          bunnyReference: content.bunnyVideoId ?? "",
          bunnyLibraryId: content.bunnyLibraryId ?? "",
          videoAspect: content.videoAspect,
          showHost: content.showHost,
          hostIntro: content.hostIntro ?? "",
          seoTitle: content.seoTitle ?? "",
          seoDescription: content.seoDescription ?? "",
          indexable: content.indexable,
        }}
      />
    </div>
  );
}
