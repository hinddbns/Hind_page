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
    <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-secondary/30 bg-secondary/5 p-5 sm:flex-row sm:items-center">
      <CoachAvatar size={64} />
      <div>
        <p className="font-serif text-lg text-ink">{site.name}</p>
        <p className="text-xs text-ink-soft">{t.about.roleTitle}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{personalText}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
          <span>
            <span className="font-semibold text-secondary-dark">{t.about.stat1Value}</span> {t.about.stat1Label}
          </span>
          <span>
            <span className="font-semibold text-secondary-dark">{t.about.stat2Value}</span> {t.about.stat2Label}
          </span>
          <span>
            <span className="font-semibold text-secondary-dark">{t.about.stat3Value}</span> {t.about.stat3Label}
          </span>
        </div>
      </div>
    </div>
  );
}
