"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";

type QuestionForRespondent = {
  id: string;
  type: "OPEN" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SCALE";
  text: string;
  order: number;
  options: { id: string; label: string }[];
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
};

type AnswerState = {
  textValue?: string;
  scaleValue?: number;
  selectedOptionIds?: string[];
};

export default function QuestionnaireForm({
  courseId,
  questions,
  initialAnswers,
}: {
  courseId: string;
  questions: QuestionForRespondent[];
  initialAnswers: Record<string, AnswerState>;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(initialAnswers);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setAnswer(questionId: string, value: AnswerState) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...value } }));
  }

  function toggleMultiple(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const current = prev[questionId]?.selectedOptionIds ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: { ...prev[questionId], selectedOptionIds: next } };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = questions.map((q) => {
      const a = answers[q.id] ?? {};
      return {
        questionId: q.id,
        textValue: q.type === "OPEN" ? a.textValue ?? "" : undefined,
        scaleValue: q.type === "SCALE" ? a.scaleValue : undefined,
        selectedOptionIds:
          q.type === "SINGLE_CHOICE"
            ? a.selectedOptionIds?.slice(0, 1) ?? []
            : q.type === "MULTIPLE_CHOICE"
              ? a.selectedOptionIds ?? []
              : undefined,
      };
    });

    const incomplete = questions.some((q) => {
      const a = answers[q.id];
      if (q.type === "OPEN") return !a?.textValue?.trim();
      if (q.type === "SCALE") return a?.scaleValue === undefined;
      return !a?.selectedOptionIds?.length;
    });

    if (incomplete) {
      setError(t.questionnaire.required);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/questionnaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, answers: payload }),
    });
    setLoading(false);

    if (!res.ok) {
      setError(t.questionnaire.genericError);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {questions.map((q) => (
        <div key={q.id} className="rounded-2xl border border-primary-light/50 bg-white p-6">
          {q.type === "OPEN" ? (
            <label htmlFor={`question-${q.id}`} className="font-medium text-ink">{q.text}</label>
          ) : (
            <p id={`question-${q.id}-label`} className="font-medium text-ink">{q.text}</p>
          )}

          {q.type === "OPEN" && (
            <textarea
              id={`question-${q.id}`}
              rows={3}
              value={answers[q.id]?.textValue ?? ""}
              onChange={(e) => setAnswer(q.id, { textValue: e.target.value })}
              className="mt-3 w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          )}

          {q.type === "SINGLE_CHOICE" && (
            <div role="group" aria-labelledby={`question-${q.id}-label`} className="mt-3 flex flex-col gap-2">
              {q.options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id]?.selectedOptionIds?.[0] === o.id}
                    onChange={() => setAnswer(q.id, { selectedOptionIds: [o.id] })}
                    className="accent-primary"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          )}

          {q.type === "MULTIPLE_CHOICE" && (
            <div role="group" aria-labelledby={`question-${q.id}-label`} className="mt-3 flex flex-col gap-2">
              {q.options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={answers[q.id]?.selectedOptionIds?.includes(o.id) ?? false}
                    onChange={() => toggleMultiple(q.id, o.id)}
                    className="accent-primary"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          )}

          {q.type === "SCALE" && q.scaleMin !== null && q.scaleMax !== null && (
            <div role="group" aria-labelledby={`question-${q.id}-label`} className="mt-4">
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: q.scaleMax - q.scaleMin + 1 }, (_, i) => q.scaleMin! + i).map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={answers[q.id]?.scaleValue === n}
                    onClick={() => setAnswer(q.id, { scaleValue: n })}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition ${
                      answers[q.id]?.scaleValue === n
                        ? "border-primary bg-primary text-cream"
                        : "border-primary-light text-ink-soft hover:border-primary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {(q.scaleMinLabel || q.scaleMaxLabel) && (
                <div className="mt-2 flex justify-between text-xs text-ink-soft">
                  <span>{q.scaleMinLabel}</span>
                  <span>{q.scaleMaxLabel}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {error && <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-full bg-primary px-6 py-3 text-sm font-medium text-cream transition hover:bg-primary-dark disabled:opacity-60"
      >
        {loading ? t.questionnaire.submitting : t.questionnaire.submit}
      </button>
    </form>
  );
}
