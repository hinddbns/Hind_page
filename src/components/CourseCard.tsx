import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { formatPrice } from "@/lib/format";

type CourseCardData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  demoVideoUrl: string | null;
  demoVideoPath: string | null;
};

const VARIANTS = {
  primary: {
    border: "border-primary-light/50",
    gradient: "from-primary-light/50 to-primary/20",
    badgeText: "text-primary-dark",
    monogram: "text-primary-dark/40",
    price: "text-primary-dark",
    cta: "border-primary text-primary hover:bg-primary hover:text-cream",
  },
  accent: {
    border: "border-accent/40",
    gradient: "from-accent-light/70 to-accent/25",
    badgeText: "text-accent-dark",
    monogram: "text-accent-dark/40",
    price: "text-accent-dark",
    cta: "border-accent text-accent-dark hover:bg-accent hover:text-ink",
  },
  olive: {
    border: "border-olive-light/60",
    gradient: "from-olive-light/60 to-olive/25",
    badgeText: "text-olive-dark",
    monogram: "text-olive-dark/40",
    price: "text-olive-dark",
    cta: "border-olive text-olive hover:bg-olive hover:text-cream",
  },
} as const;

export default function CourseCard({
  course,
  ctaLabel,
  demoLabel,
  variant = "primary",
  statusBadge,
}: {
  course: CourseCardData;
  ctaLabel: string;
  demoLabel: string;
  variant?: keyof typeof VARIANTS;
  /** Optional availability/status pill shown above the title (e.g. "متاح للاشتراك"). */
  statusBadge?: string;
}) {
  const hasDemo = course.demoVideoUrl || course.demoVideoPath;
  const colors = VARIANTS[variant];

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border ${colors.border} bg-white shadow-sm`}>
      <Link
        href={`/cours/${course.slug}`}
        className={`group relative flex h-36 items-center justify-center bg-gradient-to-br ${colors.gradient}`}
      >
        {hasDemo ? (
          <span className={`flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium ${colors.badgeText} shadow transition group-hover:bg-white`}>
            <PlayCircle className="h-4 w-4" />
            {demoLabel}
          </span>
        ) : (
          <span className={`font-serif text-3xl ${colors.monogram}`}>{course.title.slice(0, 1)}</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        {statusBadge && (
          <span className="mb-2 w-fit rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-dark">
            {statusBadge}
          </span>
        )}
        <h3 className="font-serif text-xl text-ink">{course.title}</h3>
        <p className="mt-3 flex-1 text-sm text-ink-soft line-clamp-3">{course.description}</p>
        <div className="mt-6 flex items-center justify-between">
          <span className={`font-serif text-lg ${colors.price}`}>{formatPrice(course.price)}</span>
          <Link
            href={`/cours/${course.slug}`}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${colors.cta}`}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
