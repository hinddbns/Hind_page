import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { formatPrice } from "@/lib/format";

type CourseCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  price: number;
  demoVideoUrl: string | null;
  demoVideoPath: string | null;
};

export default function CourseCard({
  course,
  ctaLabel,
  demoLabel,
}: {
  course: CourseCardData;
  ctaLabel: string;
  demoLabel: string;
}) {
  const hasDemo = course.demoVideoUrl || course.demoVideoPath;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-primary-light/50 bg-white shadow-sm">
      <Link
        href={`/cours/${course.slug}`}
        className="group relative flex h-36 items-center justify-center bg-gradient-to-br from-primary-light/50 to-accent/20"
      >
        {hasDemo ? (
          <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-primary-dark shadow transition group-hover:bg-white">
            <PlayCircle className="h-4 w-4" />
            {demoLabel}
          </span>
        ) : (
          <span className="font-serif text-3xl text-primary-dark/40">{course.title.slice(0, 1)}</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-serif text-xl text-ink">{course.title}</h3>
        <p className="mt-3 flex-1 text-sm text-ink-soft">{course.summary}</p>
        <div className="mt-6 flex items-center justify-between">
          <span className="font-serif text-lg text-primary-dark">{formatPrice(course.price)}</span>
          <Link
            href={`/cours/${course.slug}`}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-cream"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
