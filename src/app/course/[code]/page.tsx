import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { site, shareImage } from "@/lib/site";
import { getT } from "@/i18n/server";
import { interpolate } from "@/i18n/config";
import { getSiteUrl } from "@/lib/siteUrl";
import { buildBunnyEmbedUrl } from "@/lib/bunny";
import { buildYouTubeEmbedUrl } from "@/lib/youtube";
import { getFreeCourseForViewer, type FreeCourseRow } from "@/lib/freeCourse";
import { freeCourseAdminPath, freeCoursePath } from "@/lib/freeCourseAccess";
import {
  getFreeCourseVideo,
  splitParagraphs,
  summarize,
  type FreeCoursePreviewNotice,
} from "@/lib/freeCourseRules";
import { getSocialLinksByVariant } from "@/lib/socialLinks";
import SocialLinks, { hasVisibleSocialLinks } from "@/components/SocialLinks";
import BunnySeekGuardPlayer from "@/components/BunnySeekGuardPlayer";
import YouTubeSeekGuardPlayer from "@/components/YouTubeSeekGuardPlayer";

// Publish/unpublish, group-link changes and content edits must show up on the very next request,
// and draft access depends on the viewer's session — never serve this from a static/cached render.
export const dynamic = "force-dynamic";

// Always noindex: each group gets a private link, so search engines must never list one.
const NOINDEX = { index: false, follow: false } as const;

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const { t } = await getT();
  const view = await getFreeCourseForViewer(code);
  // No draft text may leak through metadata: a visitor who can't see the page gets the 404 title.
  if (!view) return { title: t.errors.notFoundTitle, robots: NOINDEX };

  const { course } = view;
  const title = course.seoTitle ?? course.title;
  const description = course.seoDescription ?? summarize(course.introduction);
  const canonical = getSiteUrl() && course.accessCode ? freeCoursePath(course.accessCode) : undefined;

  return {
    title,
    description,
    robots: NOINDEX,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ar_MA",
      siteName: site.name,
      url: canonical,
      images: [shareImage],
    },
    twitter: { card: "summary_large_image", title, description, images: [shareImage] },
  };
}

const ASPECT_CLASSES: Record<FreeCourseRow["videoAspect"], { frame: string; width: string }> = {
  LANDSCAPE: { frame: "aspect-video", width: "w-full" },
  PORTRAIT: { frame: "aspect-[9/16]", width: "mx-auto w-full max-w-xs" },
  SQUARE: { frame: "aspect-square", width: "mx-auto w-full max-w-md" },
};

export default async function FreeCoursePage({ params }: Params) {
  const { code } = await params;
  const view = await getFreeCourseForViewer(code);
  if (!view) notFound();

  const { t } = await getT();
  const { course, preview, notice } = view;
  const previewMessages: Record<FreeCoursePreviewNotice, string> = {
    draft: t.freeCourse.previewBanner,
    expired: t.freeCourse.previewExpired,
  };
  const socialLinks = (await getSocialLinksByVariant()).global;
  const paragraphs = splitParagraphs(course.introduction);
  const video = getFreeCourseVideo(course);
  const aspect = ASPECT_CLASSES[course.videoAspect];
  const videoTitle = interpolate(t.freeCourse.videoTitle, { title: course.title });
  // Only an explicit false restricts; a missing column (migration not yet applied) keeps the
  // plain embed. The restricted player is a client component, so the default path ships no JS.
  const restrictSkipping = course.allowSkipping === false;

  // Fixed order: label → introduction → video → presenter → social links. All course copy comes
  // from the FreeCourse row.
  return (
    <article className="mx-auto max-w-3xl px-6 pt-8 md:pt-10">
      {preview && (
        <div
          role="status"
          className="mb-8 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-olive-light bg-olive-light/40 px-4 py-3 text-sm text-olive-dark"
        >
          <span>{notice ? previewMessages[notice] : t.freeCourse.previewBanner}</span>
          <Link href={freeCourseAdminPath(course.id)} className="font-medium underline underline-offset-4">
            {t.freeCourse.previewBackToAdmin}
          </Link>
        </div>
      )}

      <header className="text-center">
        {/* The title isn't shown visually, but stays the page's one <h1> for screen readers/SEO. */}
        <h1 className="sr-only">{course.title}</h1>
        {course.eyebrow && (
          <p className="inline-block rounded-full bg-olive-dark px-4 py-1.5 text-base font-medium text-cream">{course.eyebrow}</p>
        )}
        {paragraphs.length > 0 && (
          <div className="mx-auto mt-4 flex max-w-2xl flex-col gap-4 text-base leading-loose text-ink-soft md:text-lg">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="whitespace-pre-line text-center [text-align-last:center]">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </header>

      <div className={`mt-8 ${aspect.width}`}>
        {video ? (
          <div className={`relative overflow-hidden rounded-2xl bg-black shadow-lg shadow-olive/10 ${aspect.frame}`}>
            {video.provider === "youtube" ? (
              restrictSkipping ? (
                <YouTubeSeekGuardPlayer
                  videoId={video.videoId}
                  title={videoTitle}
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                // YouTube refuses to play embeds that send no referrer, hence the explicit policy.
                <iframe
                  src={buildYouTubeEmbedUrl(video.videoId)}
                  title={videoTitle}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  loading="eager"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 h-full w-full border-0"
                />
              )
            ) : restrictSkipping ? (
              <BunnySeekGuardPlayer
                embedUrl={buildBunnyEmbedUrl(video, { restrictSeeking: true })}
                title={videoTitle}
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <iframe
                src={buildBunnyEmbedUrl(video)}
                title={videoTitle}
                allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                loading="eager"
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full border-0"
              />
            )}
          </div>
        ) : (
          // Only an admin preview can reach this branch: a published row always has a video
          // (enforced by isPublishable() and the FreeCourse_publish_complete constraint).
          <div
            className={`flex items-center justify-center rounded-2xl border border-dashed border-olive-light bg-parents-bg-alt/60 p-6 text-center text-sm text-ink-soft ${aspect.frame}`}
          >
            {t.freeCourse.previewNoVideo}
          </div>
        )}
      </div>

      {course.showHost && (
        <section
          aria-label={t.freeCourse.hostSectionLabel}
          className="mx-auto mt-12 flex w-fit max-w-xl items-center gap-4 border-t border-olive-light/60 pt-8"
        >
          {/* Circular crop; the inner uniform scale zooms the half-length portrait onto the face
              without distorting it. */}
          <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-parents-bg-alt ring-2 ring-olive-light md:size-28">
            <div className="absolute inset-0 origin-[50%_9%] scale-[1.8]">
              <Image
                src={site.coachPhoto}
                alt={interpolate(t.about.photoAlt, { siteName: site.name })}
                fill
                sizes="224px"
                className="object-cover object-top"
              />
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink">{site.name}</p>
            <p className="mt-1 whitespace-pre-line text-start text-sm leading-relaxed text-olive-dark [text-align-last:start]">
              {course.hostIntro ?? site.tagline}
            </p>
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
