import Link from "next/link";
import { HeartHandshake, GraduationCap, Compass, ShieldCheck, UploadCloud, MailCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";
import { getT } from "@/i18n/server";
import { interpolate } from "@/i18n/config";
import CourseCard from "@/components/CourseCard";

export const metadata = { title: "مساحة الأمهات والأساتذة" };

export default async function ParentsEnseignantsPage() {
  const { t } = await getT();

  const courses = await prisma.course.findMany({
    where: { published: true, audience: "PARENT_TEACHER" },
    orderBy: { createdAt: "asc" },
  });

  const steps = [
    { icon: MailCheck, title: t.commentCaMarche.step1Title, text: t.commentCaMarche.step1Text },
    { icon: Compass, title: t.commentCaMarche.step2Title, text: t.commentCaMarche.step2Text },
    { icon: UploadCloud, title: t.commentCaMarche.step3Title, text: t.commentCaMarche.step3Text },
    { icon: ShieldCheck, title: t.commentCaMarche.step4Title, text: t.commentCaMarche.step4Text },
  ];

  const testimonials = [
    { quote: t.testimonials.quote1, name: t.testimonials.name1 },
    { quote: t.testimonials.quote2, name: t.testimonials.name2 },
    { quote: t.testimonials.quote3, name: t.testimonials.name3 },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -end-32 -top-32 h-96 w-96 rounded-full bg-primary-light/40 blur-3xl" />
        <div className="absolute -start-24 top-40 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center">
          <span className="rounded-full border border-primary-light bg-white/60 px-4 py-1.5 text-xs font-medium tracking-wide text-primary-dark">
            {t.hero.badge}
          </span>
          <h1 className="mt-6 max-w-3xl font-serif text-4xl leading-tight text-ink md:text-6xl">
            {t.hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            {interpolate(t.hero.subtitle, { siteName: site.name })}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/inscription"
              className="rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-cream shadow-lg shadow-primary/20 transition hover:bg-primary-dark"
            >
              {t.hero.ctaPrimary}
            </Link>
            <Link
              href="#dorat"
              className="rounded-full border border-ink/15 px-7 py-3.5 text-sm font-medium text-ink transition hover:border-primary hover:text-primary"
            >
              {t.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* Pour qui */}
      <section className="bg-cream-dark/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-primary-light/50 bg-white p-8">
              <HeartHandshake className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-serif text-xl text-ink">{t.pourQui.meresTitle}</h3>
              <p className="mt-2 text-sm text-ink-soft">{t.pourQui.meresText}</p>
            </div>
            <div className="rounded-2xl border border-secondary/20 bg-white p-8">
              <GraduationCap className="h-8 w-8 text-secondary" />
              <h3 className="mt-4 font-serif text-xl text-ink">{t.pourQui.enseignantsTitle}</h3>
              <p className="mt-2 text-sm text-ink-soft">{t.pourQui.enseignantsText}</p>
            </div>
            <div className="rounded-2xl border border-accent/30 bg-white p-8">
              <Compass className="h-8 w-8 text-accent" />
              <h3 className="mt-4 font-serif text-xl text-ink">{t.pourQui.coachingTitle}</h3>
              <p className="mt-2 text-sm text-ink-soft">{t.pourQui.coachingText}</p>
            </div>
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
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" />
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
        <h2 className="font-serif text-3xl text-ink">{t.courses.sectionTitle}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              ctaLabel={t.courses.enSavoirPlus}
              demoLabel={t.courses.watchDemo}
            />
          ))}
        </div>
      </section>

      {/* Témoignages */}
      <section className="bg-cream-dark/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl text-ink">{t.testimonials.title}</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <blockquote
                key={item.name}
                className="rounded-2xl border border-primary-light/50 bg-white p-8 text-sm text-ink-soft"
              >
                <p>&ldquo;{item.quote}&rdquo;</p>
                <footer className="mt-4 font-medium text-ink">{item.name}</footer>
              </blockquote>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-ink-soft/60">{t.testimonials.disclaimer}</p>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="font-serif text-3xl text-ink md:text-4xl">{t.finalCta.title}</h2>
        <p className="mx-auto mt-4 max-w-lg text-ink-soft">{t.finalCta.subtitle}</p>
        <Link
          href="/inscription"
          className="mt-8 inline-block rounded-full bg-primary px-8 py-4 text-sm font-medium text-cream shadow-lg shadow-primary/20 transition hover:bg-primary-dark"
        >
          {t.finalCta.button}
        </Link>
      </section>
    </>
  );
}
