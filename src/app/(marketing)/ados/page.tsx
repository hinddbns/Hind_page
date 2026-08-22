import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Wind,
  MessageCircleHeart,
  CheckCircle2,
  Compass,
  ShieldCheck,
  UploadCloud,
  MailCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";
import { getT } from "@/i18n/server";
import CourseCard from "@/components/CourseCard";

export const metadata = { title: "مساحة الشباب والمراهقين" };

export default async function AdosPage() {
  const { t } = await getT();

  const courses = await prisma.course.findMany({
    where: { published: true, audience: "ADOLESCENT" },
    orderBy: { createdAt: "asc" },
  });

  const cards = [
    { icon: Sparkles, title: t.ados.card1Title, text: t.ados.card1Text },
    { icon: Wind, title: t.ados.card2Title, text: t.ados.card2Text },
    { icon: MessageCircleHeart, title: t.ados.card3Title, text: t.ados.card3Text },
  ];

  const goals = [t.ados.goal1, t.ados.goal2, t.ados.goal3];

  const testimonials = [
    { quote: t.testimonialsAdos.quote1, name: t.testimonialsAdos.name1 },
    { quote: t.testimonialsAdos.quote2, name: t.testimonialsAdos.name2 },
  ];

  const steps = [
    { icon: MailCheck, title: t.commentCaMarche.step1Title, text: t.commentCaMarche.step1Text },
    { icon: Compass, title: t.commentCaMarche.step2Title, text: t.commentCaMarche.step2Text },
    { icon: UploadCloud, title: t.commentCaMarche.step3Title, text: t.commentCaMarche.step3Text },
    { icon: ShieldCheck, title: t.commentCaMarche.step4Title, text: t.commentCaMarche.step4Text },
  ];

  return (
    <div className="bg-ados-bg">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -end-32 -top-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -start-24 top-40 h-72 w-72 rounded-full bg-accent-light/50 blur-3xl" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center">
          <span className="rounded-full bg-accent-dark px-4 py-1.5 text-xs font-medium tracking-wide text-ink">
            {t.ados.heroBadge}
          </span>
          <h1 className="mt-6 max-w-3xl font-serif text-4xl leading-tight text-ink md:text-6xl">
            {t.ados.heroTitle}
          </h1>
          <div className="relative mt-8 w-full max-w-2xl overflow-hidden rounded-2xl shadow-lg shadow-accent/10">
            <Image
              src={site.adosPhoto}
              alt=""
              width={site.adosPhotoWidth}
              height={site.adosPhotoHeight}
              sizes="(min-width: 768px) 640px, 100vw"
              priority
              className="h-auto w-full"
            />
            {/* Anchored to the photo's own empty left-hand space — physical, not logical, since the image doesn't mirror with RTL */}
            <div className="absolute inset-y-0 left-0 flex w-3/5 items-center bg-gradient-to-r from-cream via-cream/85 to-transparent p-6">
              <p className="text-lg font-medium leading-relaxed text-ink">{t.ados.heroSubtitle}</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/inscription?workspace=ADOLESCENT"
              className="rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-ink shadow-lg shadow-accent/20 transition hover:bg-accent-dark"
            >
              {t.ados.ctaPrimary}
            </Link>
            <Link
              href="#dorat"
              className="rounded-full border border-ink/15 px-7 py-3.5 text-sm font-medium text-ink transition hover:border-accent hover:text-accent"
            >
              {t.ados.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* لماذا هذا الفضاء */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <blockquote className="border-s-4 border-secondary/40 ps-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary-dark">{t.ados.missionTitle}</p>
          <p className="mt-1 font-serif text-lg italic text-ink">&ldquo;{t.ados.missionText}&rdquo;</p>
        </blockquote>

        <h2 className="mt-12 font-serif text-3xl text-ink">{t.ados.whyTitle}</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{t.ados.whyText}</p>

        <ul className="mt-8 flex flex-col gap-4">
          {goals.map((goal) => (
            <li
              key={goal}
              className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-white p-4 text-sm text-ink-soft"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="flex-1">{goal}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Pourquoi cette espace */}
      <section className="bg-ados-bg-alt py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl text-ink">{t.ados.pourToiTitle}</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {cards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-accent/30 bg-white p-8">
                <card.icon className="h-8 w-8 text-accent" />
                <h3 className="mt-4 font-serif text-xl text-ink">{card.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl text-ink">{t.commentCaMarche.title}</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map((step) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                  <step.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mt-4 font-medium text-ink">{step.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cours */}
      <section id="dorat" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-3xl text-ink">{t.ados.coursesTitle}</h2>
        {courses.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                ctaLabel={t.courses.enSavoirPlus}
                demoLabel={t.courses.watchDemo}
                variant="accent"
              />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl border border-accent/30 bg-ados-bg-alt p-8 text-center text-ink-soft">
            {t.ados.noCoursesYet}
          </p>
        )}
      </section>

      {/* Témoignages */}
      <section className="bg-ados-bg-alt py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl text-ink">{t.testimonialsAdos.title}</h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {testimonials.map((item) => (
              <blockquote
                key={item.name}
                className="rounded-2xl bg-accent-dark p-8 text-sm text-ink shadow-lg shadow-accent/20"
              >
                <p>&ldquo;{item.quote}&rdquo;</p>
                <footer className="mt-4 font-medium text-ink">{item.name}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="font-serif text-3xl text-ink md:text-4xl">{t.ados.finalCtaTitle}</h2>
        <p className="mx-auto mt-4 max-w-lg text-ink-soft">{t.ados.finalCtaSubtitle}</p>
        <Link
          href="/inscription?workspace=ADOLESCENT"
          className="mt-8 inline-block rounded-full bg-accent px-8 py-4 text-sm font-medium text-ink shadow-lg shadow-accent/20 transition hover:bg-accent-dark"
        >
          {t.ados.finalCtaButton}
        </Link>
      </section>
    </div>
  );
}
