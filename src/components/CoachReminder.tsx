import CoachAvatar from "./CoachAvatar";
import { site } from "@/lib/site";
import type { Dictionary } from "@/i18n/dictionaries/ar";

export default function CoachReminder({
  t,
  category,
}: {
  t: Dictionary;
  category?: "MOTHER" | "TEACHER" | "ADOLESCENT" | "OTHER" | null;
}) {
  const personalText =
    category === "MOTHER"
      ? t.pourQui.meresText
      : category === "TEACHER"
        ? t.pourQui.enseignantsText
        : category === "ADOLESCENT"
          ? t.ados.card1Text
          : t.about.messageText;

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-secondary/30 bg-secondary/5 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
      <CoachAvatar size={52} />
      <div className="min-w-0">
        <p className="font-serif text-base text-ink">
          {site.name} <span className="text-xs font-normal text-ink-soft">· {t.about.roleTitle}</span>
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{personalText}</p>
      </div>
    </div>
  );
}
