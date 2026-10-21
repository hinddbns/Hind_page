import type { Metadata } from "next";
import Image from "next/image";
import { Check, Heart, PencilLine, Play, Plus, School, Sprout } from "lucide-react";
import { site } from "@/lib/site";
import { getT } from "@/i18n/server";
import { db } from "@/lib/supabase/db";
import { buildBunnyEmbedUrl } from "@/lib/bunny";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { getPublishedWorkshopVideo } from "@/lib/workshop";

// Standalone sales page for the "من الصراع إلى الهدوء" workshop, shared by link only: no Nav/Footer,
// no links into the rest of the app, and noindex. The root layout still supplies the RTL shell,
// font, floating WhatsApp button and toasts. Copy is code-defined (dictionary `workshop`); only the
// optional Bunny video comes from Settings (/admin/parametres).
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.workshop.metaTitle,
    description: t.workshop.metaDescription,
    robots: { index: false, follow: false },
    openGraph: {
      title: t.workshop.metaTitle,
      description: t.workshop.metaDescription,
      type: "website",
      locale: "ar_MA",
      siteName: site.name,
    },
  };
}

const container = "mx-auto w-full max-w-6xl px-4 md:px-6";
const section = "py-16 md:py-20";
const sectionTitle = "font-serif text-3xl leading-snug text-olive-dark md:text-4xl";
const sectionIntro = "mt-3 max-w-3xl text-ink-soft";
const card = "rounded-2xl border border-olive-light bg-white p-6";
const cardTitle = "text-lg font-bold text-olive-dark";
const iconTile = "mb-4 grid size-11 place-items-center rounded-xl bg-olive-light/60 text-olive-dark";
const pillButton =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-olive-dark px-7 py-3 font-bold text-cream transition hover:bg-ink";

export default async function WorkshopPage() {
  const { t } = await getT();
  const w = t.workshop;

  // select("*") rather than named columns so the page still renders (without a video) if the
  // workshop video migration hasn't been applied yet.
  const { data: settings, error } = await db.from("Settings").select("*").eq("id", "main").maybeSingle();
  if (error) throw error;
  const video = getPublishedWorkshopVideo(settings);
  const whatsappUrl = buildWhatsAppUrl(settings?.whatsappNumber, w.whatsappMessage);

  const audience = [
    { Icon: Heart, title: w.audienceMotherTitle, text: w.audienceMotherText },
    { Icon: School, title: w.audienceTeacherTitle, text: w.audienceTeacherText },
    { Icon: Sprout, title: w.audienceSelfTitle, text: w.audienceSelfText },
  ];

  return (
    <div className="flex flex-1 flex-col bg-white leading-loose">
      <header className="border-b border-cream-dark bg-white py-4">
        <p className={`${container} font-bold text-olive-dark`}>
          {w.brandName} <span className="font-normal text-ink-soft">| {w.brandTagline}</span>
        </p>
      </header>

      <main className="flex-1 animate-shell-arrive">
        <section className="bg-cream-dark py-12 md:py-16">
          <div className={`${container} grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]`}>
            <div>
              <p className="text-sm font-bold text-olive">{w.heroEyebrow}</p>
              <h1 className="mt-3 font-serif text-4xl leading-snug text-olive-dark md:text-6xl md:leading-tight">
                {w.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-ink-soft">{w.heroLead}</p>
              <p className="mt-3 text-ink-soft">{w.heroText}</p>
              <a href="#register" className={`${pillButton} mt-6`}>
                {w.heroCta}
              </a>
              <p className="mt-3 text-sm text-ink-soft">{w.heroNote}</p>
            </div>

            {video ? (
              <div className="relative aspect-video overflow-hidden rounded-3xl bg-black shadow-lg shadow-olive/10">
                <iframe
                  src={buildBunnyEmbedUrl(video)}
                  title={w.videoTitle}
                  allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
            ) : (
              // Same 16:9 frame as the player, so publishing the video swaps it in without a layout shift.
              <div className="relative flex aspect-video flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl bg-gradient-to-br from-olive-light via-parents-bg-alt to-cream p-5 text-center shadow-lg shadow-olive/10">
                <span className="grid size-14 place-items-center rounded-full bg-white/85 text-olive-dark shadow-lg shadow-olive/15 ring-8 ring-white/40 md:size-16">
                  <Play className="size-6 translate-x-0.5 fill-current md:size-7" aria-hidden />
                </span>
                <p className="mt-1 text-lg font-bold text-olive-dark">{w.heroArtTitle}</p>
                <p className="hidden text-sm text-ink-soft md:block">{w.heroArtText}</p>
                <span className="rounded-full bg-olive-dark px-3 py-1 text-xs font-medium text-cream">{w.videoSoon}</span>
              </div>
            )}
          </div>
        </section>

        <section className={`${section} bg-cream`}>
          <div className={container}>
            <h2 className={sectionTitle}>{w.painTitle}</h2>
            <p className={sectionIntro}>{w.painIntro}</p>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <article className={card}>
                <div className={iconTile}>
                  <Heart className="size-5" aria-hidden />
                </div>
                <h3 className={cardTitle}>{w.painHomeTitle}</h3>
                <p className="mt-2 text-ink-soft">{w.painHomeText}</p>
              </article>
              <article className={card}>
                <div className={iconTile}>
                  <PencilLine className="size-5" aria-hidden />
                </div>
                <h3 className={cardTitle}>{w.painClassTitle}</h3>
                <p className="mt-2 text-ink-soft">{w.painClassText}</p>
              </article>
            </div>
            <p className="mt-8 border-s-4 border-olive ps-4 text-lg font-bold text-olive-dark">{w.painQuote}</p>
          </div>
        </section>

        <section className={section}>
          <div className={container}>
            <h2 className={sectionTitle}>{w.audienceTitle}</h2>
            <p className={sectionIntro}>{w.audienceIntro}</p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {audience.map(({ Icon, title, text }) => (
                <article key={title} className={card}>
                  <div className={iconTile}>
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className={cardTitle}>{title}</h3>
                  <p className="mt-2 text-ink-soft">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${section} bg-cream`}>
          <div className={container}>
            <h2 className={sectionTitle}>{w.daysTitle}</h2>
            <p className={sectionIntro}>{w.daysIntro}</p>
            <ol className="mt-4">
              {w.days.map((day) => (
                <li
                  key={day.number}
                  className="grid grid-cols-[5rem_1fr] gap-4 border-b border-cream-dark py-6 last:border-b-0 md:grid-cols-[7rem_1fr] md:gap-5"
                >
                  <div className="grid min-h-24 place-content-center rounded-2xl bg-cream-dark text-center font-bold text-olive-dark">
                    <span>{w.dayLabel}</span>
                    <span className="text-3xl leading-tight">{day.number}</span>
                  </div>
                  <div>
                    <h3 className={cardTitle}>{day.title}</h3>
                    <p className="font-bold text-ink">{day.subtitle}</p>
                    <ul className="mt-2 list-disc space-y-1 ps-5 text-ink-soft marker:text-olive">
                      {day.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={section}>
          <div className={container}>
            <h2 className={sectionTitle}>{w.goalsTitle}</h2>
            <p className={sectionIntro}>{w.goalsIntro}</p>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {w.goals.map((goal) => (
                <article key={goal.title} className={card}>
                  <h3 className={cardTitle}>{goal.title}</h3>
                  <p className="mt-2 text-ink-soft">{goal.text}</p>
                </article>
              ))}
            </div>
            <p className="mt-6 text-sm text-ink-soft">{w.goalsNote}</p>
          </div>
        </section>

        <section className={`${section} bg-cream`}>
          <div className={container}>
            <h2 className={sectionTitle}>{w.faqTitle}</h2>
            <p className={sectionIntro}>{w.faqHint}</p>
            {/* A chat: her doubt is the bubble she taps, Hind's reply appears beneath it. Native
                <details> keeps it keyboard/screen-reader operable with zero client JS. */}
            <div className="mt-8 flex max-w-3xl flex-col gap-4">
              {w.faq.map((item) => (
                <details key={item.question} className="group">
                  <summary className="flex w-fit max-w-[92%] cursor-pointer list-none items-center gap-3 rounded-3xl rounded-ss-md border border-olive-light bg-white px-5 py-4 shadow-sm shadow-olive/5 transition hover:border-olive group-open:border-olive [&::-webkit-details-marker]:hidden">
                    <h3 className="font-bold text-olive-dark">{item.question}</h3>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-olive-light/60 text-olive-dark transition group-open:rotate-45 group-open:bg-olive-dark group-open:text-cream motion-reduce:transition-none">
                      <Plus className="size-4" aria-hidden />
                    </span>
                  </summary>
                  <div className="mt-3 flex animate-shell-arrive items-end justify-end gap-2">
                    <div className="max-w-[85%] rounded-3xl rounded-ee-md bg-olive-dark px-5 py-4 text-cream">
                      <p className="text-sm font-bold text-olive-light">{w.hostName}</p>
                      <p className="mt-1 text-start [text-align-last:start]">{item.answer}</p>
                    </div>
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full ring-2 ring-olive-light">
                      <Image src={site.coachPhoto} alt="" fill sizes="40px" className="object-cover object-top" />
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={section}>
          <div className={container}>
            <h2 className={sectionTitle}>{w.hostTitle}</h2>
            <div className="mt-8 grid items-start gap-6 md:grid-cols-[10rem_1fr]">
              <div className="relative h-36 w-32 overflow-hidden rounded-3xl bg-parents-bg-alt md:h-44 md:w-40">
                <Image
                  src={site.coachPhoto}
                  alt={w.hostPhotoAlt}
                  fill
                  sizes="(min-width: 768px) 160px, 128px"
                  className="object-cover object-top"
                />
              </div>
              <div className="space-y-3 text-ink-soft">
                <h3 className="text-xl font-bold text-olive-dark">{w.hostName}</h3>
                <p>{w.hostBio1}</p>
                <p>{w.hostBio2}</p>
                <p className="font-bold text-ink">{w.hostMotto}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="register" className={`${section} scroll-mt-4 bg-cream-dark`}>
          <div className={container}>
            <div className="text-center">
              <h2 className={sectionTitle}>{w.priceTitle}</h2>
              <p className={`${sectionIntro} mx-auto [text-align-last:center]`}>{w.priceIntro}</p>
            </div>
            <div className="mx-auto mt-8 max-w-2xl rounded-3xl bg-white p-6 text-center shadow-lg shadow-olive/10 md:p-9">
              <p className="font-bold text-olive">{w.priceLabel}</p>
              <h3 className="text-xl font-bold text-olive-dark">{w.priceCardTitle}</h3>
              <p className="my-2 text-5xl font-bold leading-snug text-olive-dark">{w.price}</p>
              <p className="text-ink-soft">{w.priceReference}</p>
              <ul className="mx-auto my-5 max-w-md space-y-1 text-start">
                {w.priceFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-1.5 size-4 shrink-0 text-olive" strokeWidth={3} aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <a href="#contact" className={pillButton}>
                {w.priceCta}
              </a>
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-4 bg-olive-dark py-16 text-center text-cream">
          <div className={container}>
            <h2 className="font-serif text-3xl leading-snug md:text-4xl">{w.finalTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-cream/85 [text-align-last:center]">{w.finalText}</p>
            {/* Hidden rather than linking nowhere while the shared number is unset or the placeholder. */}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-cream px-7 py-3 font-bold text-olive-dark transition hover:bg-white"
              >
                {w.finalCta}
              </a>
            )}
          </div>
        </section>
      </main>

      {/* pb-28 keeps the fixed WhatsApp button (bottom-6, h-14) clear of the footer text. */}
      <footer className="px-4 pb-28 pt-6 text-center text-sm text-ink-soft">{w.footer}</footer>
    </div>
  );
}
