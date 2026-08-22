import Link from "next/link";
import Image from "next/image";
import {
  HeartHandshake,
  GraduationCap,
  Compass,
  ShieldCheck,
  UploadCloud,
  MailCheck,
  CheckCircle2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";
import { getT } from "@/i18n/server";
import CourseCard from "@/components/CourseCard";

export const metadata = { title: "مساحة الأمهات والأستاذات" };

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
    { quote: t.testimonialsParents.quote1, name: t.testimonialsParents.name1 },
    { quote: t.testimonialsParents.quote2, name: t.testimonialsParents.name2 },
    { quote: t.testimonialsParents.quote3, name: t.testimonialsParents.name3 },
  ];

  const goals = [t.parentsSpace.goal1, t.parentsSpace.goal2, t.parentsSpace.goal3];

  return (
    <div className="bg-parents-bg">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -end-32 -top-32 h-96 w-96 rounded-full bg-olive-light/40 blur-3xl" />
        <div className="absolute -start-24 top-40 h-72 w-72 rounded-full bg-olive/20 blur-3xl" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center">
          <span className="rounded-full border border-olive-light bg-white/60 px-4 py-1.5 text-xs font-medium tracking-wide text-olive-dark">
            {t.hero.badge}
          </span>
          <h1 className="mt-6 max-w-3xl font-serif text-4xl leading-tight text-ink md:text-6xl">
            {t.hero.title}
          </h1>
          <Image
            src={site.motherTeenPhoto}
            alt={t.hero.subtitle}
            width={site.motherTeenPhotoWidth}
            height={site.motherTeenPhotoHeight}
            sizes="(min-width: 768px) 640px, 100vw"
            priority
            className="mt-8 h-auto w-full max-w-2xl rounded-2xl shadow-lg shadow-olive/10"
          />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/inscription?workspace=PARENT_TEACHER"
              className="rounded-full bg-olive px-7 py-3.5 text-sm font-medium text-cream shadow-lg shadow-olive/20 transition hover:bg-olive-dark"
            >
              {t.hero.ctaPrimary}
            </Link>
            <Link
              href="#dorat"
              className="rounded-full border border-ink/15 px-7 py-3.5 text-sm font-medium text-ink transition hover:border-olive hover:text-olive"
            >
              {t.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* لماذا هذا الفضاء */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <blockquote className="border-s-4 border-secondary/40 ps-4">
          <p className="text-xs font-medium uppercase tracking-wide text-secondary">
            {t.parentsSpace.missionTitle}
          </p>
          <p className="mt-1 font-serif text-lg italic text-ink">&ldquo;{t.parentsSpace.missionText}&rdquo;</p>
        </blockquote>

        <h2 className="mt-12 font-serif text-3xl text-ink">{t.parentsSpace.whyTitle}</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{t.parentsSpace.whyText}</p>

        <ul className="mt-8 flex flex-col gap-4">
          {goals.map((goal) => (
            <li
              key={goal}
              className="flex items-start gap-3 rounded-2xl border border-olive-light/60 bg-white p-4 text-sm text-ink-soft"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-olive" />
              <span className="flex-1">{goal}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Pour qui */}
      <section className="bg-parents-bg-alt py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-olive-light/50 bg-white p-8">
              <HeartHandshake className="h-8 w-8 text-olive" />
              <h3 className="mt-4 font-serif text-xl text-ink">{t.pourQui.meresTitle}</h3>
              <p className="mt-2 text-sm text-ink-soft">{t.pourQui.meresText}</p>
            </div>
            <div className="rounded-2xl border border-secondary/20 bg-white p-8">
              <GraduationCap className="h-8 w-8 text-secondary" />
              <h3 className="mt-4 font-serif text-xl text-ink">{t.pourQui.enseignantsTitle}</h3>
              <p className="mt-2 text-sm text-ink-soft">{t.pourQui.enseignantsText}</p>
            </div>
            <div className="rounded-2xl border border-olive/30 bg-white p-8">
              <Compass className="h-8 w-8 text-olive-dark" />
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
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-olive/10">
                  <step.icon className="h-6 w-6 text-olive" />
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
              variant="olive"
            />
          ))}
        </div>
      </section>

      {/* Témoignages */}
      <section className="bg-parents-bg-alt py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl text-ink">{t.testimonialsParents.title}</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <blockquote
                key={item.name}
                className="rounded-2xl bg-olive-dark p-8 text-sm text-cream/80 shadow-lg shadow-olive/20"
              >
                <p>&ldquo;{item.quote}&rdquo;</p>
                <footer className="mt-4 font-medium text-cream">{item.name}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="font-serif text-3xl text-ink md:text-4xl">{t.finalCta.title}</h2>
        <p className="mx-auto mt-4 max-w-lg text-ink-soft">{t.finalCta.subtitle}</p>
        <Link
          href="/inscription?workspace=PARENT_TEACHER"
          className="mt-8 inline-block rounded-full bg-olive px-8 py-4 text-sm font-medium text-cream shadow-lg shadow-olive/20 transition hover:bg-olive-dark"
        >
          {t.finalCta.button}
        </Link>
      </section>
    </div>
  );
}
