import { site } from "@/lib/site";

export default function CoachPortrait({ caption, alt }: { caption: string; alt: string }) {
  const initial = site.name.trim().charAt(0);

  return (
    <div
      role="img"
      aria-label={alt}
      className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-secondary via-secondary-dark to-primary-dark shadow-xl shadow-secondary/20"
    >
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="absolute -end-10 -top-10 h-40 w-40 rounded-full bg-accent/30 blur-2xl" />
      <div className="absolute -start-12 bottom-10 h-48 w-48 rounded-full bg-primary-light/20 blur-2xl" />

      <div className="relative flex h-full items-center justify-center">
        <span className="font-serif text-[7rem] leading-none text-cream/90 drop-shadow-sm">
          {initial}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-5">
        <span className="rounded-full bg-black/20 px-4 py-1.5 text-xs font-medium text-cream backdrop-blur-sm">
          {caption}
        </span>
      </div>
    </div>
  );
}
