import Link from "next/link";
import Image from "next/image";
import {
  Ear,
  Wrench,
  Lock,
  Sparkles,
  HeartHandshake,
  Compass,
  ShieldCheck,
  UploadCloud,
  MailCheck,
  ChevronDown,
  Target,
  Telescope,
  CheckCircle2,
  Award,
  MessageCircle,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { site } from "@/lib/site";
import { getT } from "@/i18n/server";
import { interpolate } from "@/i18n/config";

export default async function Home() {
  const { t } = await getT();

  const steps = [
    { icon: MailCheck, title: t.commentCaMarche.step1Title, text: t.commentCaMarche.step1Text },
    { icon: Compass, title: t.commentCaMarche.step2Title, text: t.commentCaMarche.step2Text },
    { icon: UploadCloud, title: t.commentCaMarche.step3Title, text: t.commentCaMarche.step3Text },
    { icon: ShieldCheck, title: t.commentCaMarche.step4Title, text: t.commentCaMarche.step4Text },
  ];

  const values = [
    { icon: Ear, title: t.about.value1Title, text: t.about.value1Text },
    { icon: Wrench, title: t.about.value2Title, text: t.about.value2Text },
    { icon: Lock, title: t.about.value3Title, text: t.about.value3Text },
  ];

  const testimonials = [
    { quote: t.testimonials.quote1, name: t.testimonials.name1 },
    { quote: t.testimonials.quote2, name: t.testimonials.name2 },
    { quote: t.testimonials.quote3, name: t.testimonials.name3 },
  ];

  const services = [
    { icon: MessageCircle, title: t.services.item1, accent: "text-primary", border: "border-primary-light/60" },
    { icon: GraduationCap, title: t.services.item2, accent: "text-secondary", border: "border-secondary/30" },
    { icon: BookOpen, title: t.services.item3, accent: "text-accent", border: "border-accent/30" },
  ];

  return (
    <>
      {/* Hook — première impression */}
      <section className="relative overflow-hidden">
        <div className="absolute -end-32 -top-32 h-96 w-96 rounded-full bg-primary-light/40 blur-3xl" />
        <div className="absolute -start-24 top-40 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
          <h1 className="font-serif text-3xl leading-snug text-ink md:text-5xl">{t.hub.hookQuote}</h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">{t.hub.hookText}</p>
          <Link
            href="#choisir-espace"
            className="mt-8 inline-block rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-cream shadow-lg shadow-primary/20 transition hover:bg-primary-dark"
          >
            {t.hub.hookCta}
          </Link>
          <ChevronDown className="mt-10 h-6 w-6 animate-bounce text-ink-soft/50" aria-hidden />
        </div>
      </section>

      {/* À propos de la coach */}
      <section id="a-propos" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-primary-light/50 bg-white p-4">
            <Image
              src={site.coachPhoto}
              alt={interpolate(t.about.photoAlt, { siteName: site.name })}
              width={site.coachPhotoWidth}
              height={site.coachPhotoHeight}
              sizes="(min-width: 768px) 384px, 100vw"
              className="h-auto w-full rounded-2xl"
            />
          </div>

          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-secondary">
              {t.about.role}
            </span>
            <h2 className="mt-3 font-serif text-3xl text-ink md:text-4xl">
              {interpolate(t.about.sectionTitle, { siteName: site.name })}
            </h2>

            <blockquote className="mt-6 border-s-4 border-secondary/40 ps-4">
              <p className="text-xs font-medium uppercase tracking-wide text-secondary">{t.about.messageTitle}</p>
              <p className="mt-1 font-serif text-lg italic text-ink">&ldquo;{t.about.messageText}&rdquo;</p>
            </blockquote>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { value: t.about.stat1Value, label: t.about.stat1Label },
                { value: t.about.stat2Value, label: t.about.stat2Label },
                { value: t.about.stat3Value, label: t.about.stat3Label },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-secondary-light/60 px-3 py-4 text-center">
                  <p className="font-serif text-2xl text-secondary-dark">{stat.value}</p>
                  <p className="mt-1 text-xs text-ink-soft">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-cream-dark/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-primary-light/50 bg-white p-8 md:p-10">
              <Target className="h-7 w-7 text-primary" />
              <h3 className="mt-4 font-serif text-2xl text-ink">{t.about.missionTitle}</h3>
              <p className="mt-4 text-ink-soft">{t.about.missionText}</p>
            </div>
            <div className="rounded-3xl border border-secondary/30 bg-white p-8 md:p-10">
              <Telescope className="h-7 w-7 text-secondary" />
              <h3 className="mt-4 font-serif text-2xl text-ink">{t.about.visionTitle}</h3>
              <p className="mt-4 text-ink-soft">{t.about.visionText}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Identifiants — من هند بنياس */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center font-serif text-3xl text-ink">{t.about.credentialsTitle}</h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {t.about.credentials.map((credential) => (
            <li
              key={credential}
              className="flex items-start gap-3 rounded-2xl border border-primary-light/40 bg-white p-4 text-sm text-ink-soft"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
              <span>{credential}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* أعمالي */}
      <section className="bg-cream-dark/60 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-serif text-3xl text-ink">{t.about.workTitle}</h2>
          <ul className="mt-10 flex flex-col gap-4">
            {t.about.work.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-primary-light/50 bg-white p-5 text-sm text-ink-soft"
              >
                <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Valeurs */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-serif text-3xl text-ink md:text-3xl">{t.about.valuesTitle}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {values.map((value) => (
            <div key={value.title} className="rounded-2xl border border-primary-light/50 bg-white p-6">
              <value.icon className="h-7 w-7 text-secondary" />
              <h4 className="mt-4 font-medium text-ink">{value.title}</h4>
              <p className="mt-2 text-sm text-ink-soft">{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* خدماتنا */}
      <section className="bg-cream-dark/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl text-ink">{t.services.title}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.title}
                className={`flex flex-col items-center gap-3 rounded-2xl border ${service.border} bg-white p-8 text-center`}
              >
                <service.icon className={`h-8 w-8 ${service.accent}`} />
                <h3 className="font-medium text-ink">{service.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Choisir son espace */}
      <section id="choisir-espace" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl text-ink">{t.hub.chooseSpaceTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-ink-soft">{t.hub.chooseSpaceSubtitle}</p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Link
              href="/ados"
              className="group flex flex-col rounded-3xl border border-accent/30 bg-white p-8 transition hover:border-accent hover:shadow-lg"
            >
              <Sparkles className="h-9 w-9 text-accent" />
              <h3 className="mt-5 font-serif text-2xl text-ink">{t.hub.adosCardTitle}</h3>
              <p className="mt-3 flex-1 text-sm text-ink-soft">{t.hub.adosCardText}</p>
              <span className="mt-6 text-sm font-medium text-accent group-hover:underline">
                {t.hub.adosCardCta}
              </span>
            </Link>

            <Link
              href="/parents-enseignants"
              className="group flex flex-col rounded-3xl border border-primary-light/60 bg-white p-8 transition hover:border-primary hover:shadow-lg"
            >
              <HeartHandshake className="h-9 w-9 text-primary" />
              <h3 className="mt-5 font-serif text-2xl text-ink">{t.hub.parentsCardTitle}</h3>
              <p className="mt-3 flex-1 text-sm text-ink-soft">{t.hub.parentsCardText}</p>
              <span className="mt-6 text-sm font-medium text-primary group-hover:underline">
                {t.hub.parentsCardCta}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-cream-dark/60 py-20">
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

      {/* Témoignages — placeholder quotes pending real client testimonials, see ROADMAP.md */}
      <section id="temoignages" className="py-20">
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
