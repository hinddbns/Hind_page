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
import { splitParagraphs, summarize } from "@/lib/freeCourseRules";
import { getSocialLinksByVariant } from "@/lib/socialLinks";
import { db } from "@/lib/supabase/db";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import SocialLinks, { hasVisibleSocialLinks } from "@/components/SocialLinks";
import { WhatsAppIcon } from "@/components/WhatsAppButton";

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
  const [socialLinksByVariant, settingsResult] = await Promise.all([
    getSocialLinksByVariant(),
    db.from("Settings").select("whatsappNumber").eq("id", "main").maybeSingle(),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  const socialLinks = socialLinksByVariant.global;
  // Same shared number as the floating button; null when unset or still the placeholder, in which
  // case the booking CTA is hidden rather than pointing visitors at a fake number.
  const whatsappUrl = buildWhatsAppUrl(settingsResult.data?.whatsappNumber);
  const paragraphs = splitParagraphs(course.introduction);
  const hasVideo =
    course.bunnyLibraryId !== null &&
    course.bunnyVideoId !== null &&
    isValidBunnyLibraryId(course.bunnyLibraryId) &&
    isValidBunnyVideoId(course.bunnyVideoId);
  const aspect = ASPECT_CLASSES[course.videoAspect];

  // Fixed order: label → introduction → video → booking CTA → presenter → social links. All
  // course copy comes from the FreeCourse row; only the CTA labels are shared dictionary text.
  return (
    <article className="mx-auto max-w-3xl px-6 pt-8 md:pt-10">
      {preview && (
        <div
          role="status"
          className="mb-8 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-olive-light bg-olive-light/40 px-4 py-3 text-sm text-olive-dark"
        >
          <span>{t.freeCourse.previewBanner}</span>
          <Link href="/admin/cours-gratuit" className="font-medium underline underline-offset-4">
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
        {hasVideo ? (
          <div className={`relative overflow-hidden rounded-2xl bg-black shadow-lg shadow-olive/10 ${aspect.frame}`}>
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
            className={`flex items-center justify-center rounded-2xl border border-dashed border-olive-light bg-parents-bg-alt/60 p-6 text-center text-sm text-ink-soft ${aspect.frame}`}
          >
            {t.freeCourse.previewNoVideo}
          </div>
        )}
      </div>

      {whatsappUrl ? (
        <section aria-labelledby="free-course-cta" className="mt-8 flex flex-col items-center text-center">
          <h2 id="free-course-cta" className="font-serif text-xl text-ink md:text-2xl">
            {t.freeCourse.ctaHeading}
          </h2>
          <p className="mt-1 text-sm text-ink-soft [text-align-last:center] md:text-base">
            {t.freeCourse.ctaSubheading}
          </p>
          {/* The mothers space's button style, on its darker olive token: cream text on olive-dark
              passes WCAG AA, while on plain olive (~4.4:1) it falls just short at this size. */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-olive-dark px-7 py-3 text-base font-medium text-cream shadow-lg shadow-olive/20 transition hover:opacity-90"
          >
            <WhatsAppIcon size={22} />
            {t.freeCourse.ctaButton}
          </a>
        </section>
      ) : (
        preview && (
          <p role="note" className="mt-8 rounded-2xl border border-dashed border-olive-light p-4 text-center text-sm text-olive-dark">
            {t.freeCourse.ctaUnavailablePreview}
          </p>
        )
      )}

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
