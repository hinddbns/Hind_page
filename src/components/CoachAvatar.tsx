import { site } from "@/lib/site";

export default function CoachAvatar({ size = 64 }: { size?: number }) {
  const initial = site.name.trim().charAt(0);

  return (
    <div
      aria-hidden
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-secondary via-secondary-dark to-primary-dark shadow-md shadow-secondary/20"
      style={{ width: size, height: size }}
    >
      <span
        className="font-serif leading-none text-cream/90"
        style={{ fontSize: size * 0.4 }}
      >
        {initial}
      </span>
    </div>
  );
}
