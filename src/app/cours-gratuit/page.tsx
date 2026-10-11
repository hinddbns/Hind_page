import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";
import { getT } from "@/i18n/server";
import { interpolate } from "@/i18n/config";
import { getSiteUrl } from "@/lib/siteUrl";
import { buildBunnyEmbedUrl, isValidBunnyLibraryId, isValidBunnyVideoId } from "@/lib/bunny";
import { FREE_COURSE_PATH, getFreeCourseForViewer, type FreeCourseRow } from "@/lib/freeCourse";
import { summarize } from "@/lib/freeCourseRules";
import { getSocialLinksByVariant } from "@/lib/socialLinks";
import SocialLinks, { hasVisibleSocialLinks } from "@/components/SocialLinks";

// Publish/unpublish and content edits must show up on the very next request, and draft access
// depends on the viewer's session — never serve this page from a static or cached render.
export const dynamic = "force-dynamic";

const NOINDEX = { index: false, follow: false } as const;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const view = await getFreeCourseForViewer();
  // No draft text may leak through metadata: a visitor who can't see the page gets the 404 title.
  if (!view) return { title: t.errors.notFoundTitle, robots: NOINDEX };

  const { course, preview } = view;
  const title = course.seoTitle ?? course.title;
  const description = course.seoDescription ?? summarize(course.introduction);
  const canonical = getSiteUrl() ? FREE_COURSE_PATH : undefined;

  return {
    title,
    description,
    robots: !preview && course.indexable ? { index: true, follow: true } : NOINDEX,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ar_MA",
      siteName: site.name,
      url: canonical,
    },
    twitter: { card: "summary", title, description },
  };
}

const ASPECT_CLASSES: Record<FreeCourseRow["videoAspect"], { frame: string; width: string }> = {
  LANDSCAPE: { frame: "aspect-video", width: "w-full" },
  PORTRAIT: { frame: "aspect-[9/16]", width: "mx-auto w-full max-w-xs" },
  SQUARE: { frame: "aspect-square", width: "mx-auto w-full max-w-md" },
};

export default async function FreeCoursePage() {
  const view = await getFreeCourseForViewer();
  if (!view) notFound();

  const { t } = await getT();
  const { course, preview } = view;
  const socialLinks = (await getSocialLinksByVariant()).global;
  const hasVideo =
    course.bunnyLibraryId !== null &&
    course.bunnyVideoId !== null &&
    isValidBunnyLibraryId(course.bunnyLibraryId) &&
    isValidBunnyVideoId(course.bunnyVideoId);
  const aspect = ASPECT_CLASSES[course.videoAspect];

  return (
    <article className="mx-auto max-w-3xl px-6 pt-8 md:pt-10">
      {preview && (
        <div
          role="status"
          className="mb-8 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary-light bg-primary-light/30 px-4 py-3 text-sm text-primary-dark"
        >
          <span>{t.freeCourse.previewBanner}</span>
          <Link href="/admin/cours-gratuit" className="font-medium underline underline-offset-4">
            {t.freeCourse.previewBackToAdmin}
          </Link>
        </div>
      )}

      <header className="text-center">
        {course.eyebrow && (
          <p className="text-sm font-medium text-secondary [text-align-last:center]">{course.eyebrow}</p>
        )}
        <h1 className="mt-2 font-serif text-3xl leading-snug text-ink md:text-4xl">{course.title}</h1>
      </header>

      {/* The video sits directly under the title so it's within the first screen on phones; the
          (up to 600-character) introduction follows it rather than pushing it below the fold. */}
      <div className={`mt-8 ${aspect.width}`}>
        {hasVideo ? (
          <div className={`relative overflow-hidden rounded-2xl bg-black shadow-xl shadow-primary/10 ${aspect.frame}`}>
            <iframe
              src={buildBunnyEmbedUrl({ libraryId: course.bunnyLibraryId!, videoId: course.bunnyVideoId! })}
              title={interpolate(t.freeCourse.videoTitle, { title: course.title })}
              allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              loading="eager"
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : (
          // Only an admin preview can reach this branch: a published row always has a video
          // (enforced by isPublishable() and the FreeCourse_publish_complete constraint).
          <div
            className={`flex items-center justify-center rounded-2xl border border-dashed border-primary-light bg-cream-dark/60 p-6 text-center text-sm text-ink-soft ${aspect.frame}`}
          >
            {t.freeCourse.previewNoVideo}
          </div>
        )}
      </div>

      {course.introduction && (
        <p className="mx-auto mt-8 max-w-2xl whitespace-pre-line text-base leading-relaxed text-ink-soft md:text-lg">
          {course.introduction}
        </p>
      )}

      {course.showHost && (
        <section
          aria-label={t.freeCourse.hostSectionLabel}
          className="mx-auto mt-12 flex max-w-xl items-center gap-4 border-t border-primary-light/40 pt-8"
        >
          {/* Arch crop echoing the logo's arch motif; the inner scale zooms the full-length
              portrait onto head and shoulders. */}
          <div className="relative h-22.5 w-18 shrink-0 overflow-hidden rounded-t-full rounded-b-2xl bg-cream-dark md:h-27.5 md:w-22">
            <div className="absolute inset-0 origin-[50%_5%] scale-[1.7]">
              <Image
                src={site.coachPhoto}
                alt={interpolate(t.about.photoAlt, { siteName: site.name })}
                fill
                sizes="160px"
                className="object-cover object-top"
              />
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink">{site.name}</p>
            <p className="text-sm text-secondary">{site.tagline}</p>
            {course.hostIntro && <p className="mt-1 text-sm text-ink-soft">{course.hostIntro}</p>}
          </div>
        </section>
      )}

      {hasVisibleSocialLinks(socialLinks) && (
        <section aria-labelledby="free-course-social" className="mt-10 flex flex-col items-center gap-3">
          <h2 id="free-course-social" className="text-sm font-medium text-ink-soft">
            {t.freeCourse.socialTitle}
          </h2>
          <SocialLinks links={socialLinks} />
        </section>
      )}
    </article>
  );
}
