"use client";

import { useId, useState } from "react";
import type { ActionState } from "@/app/(app)/admin/actions";
import { useLocale } from "@/i18n/LocaleProvider";
import { interpolate } from "@/i18n/config";
import { useToastActionState } from "@/lib/useToastActionState";
import { FREE_COURSE_LIMITS, VIDEO_ASPECTS, textLength, type VideoAspect } from "@/lib/freeCourseRules";
import { ACCESS_CODE_MAX_LENGTH } from "@/lib/freeCourseAccess";
import FormSubmitButton from "@/components/admin/FormSubmitButton";

type Values = {
  title: string;
  eyebrow: string;
  introduction: string;
  bunnyReference: string;
  bunnyLibraryId: string;
  videoAspect: VideoAspect;
  allowSkipping: boolean;
  showHost: boolean;
  hostIntro: string;
  seoTitle: string;
  seoDescription: string;
  accessCode: string;
  accessExpiresOn: string;
};

const inputClass =
  "w-full rounded-lg border border-primary-light bg-white px-3 py-2 text-sm outline-none focus:border-primary";
const fieldsetClass = "rounded-2xl border border-primary-light/50 bg-white p-6";
const legendClass = "px-1 font-serif text-lg text-primary";

function Counter({ id, value, max, template }: { id: string; value: string; max: number; template: string }) {
  const n = textLength(value);
  return (
    <p id={id} className={`mt-1 text-xs ${n > max ? "text-danger" : "text-ink-soft"}`}>
      {interpolate(template, { n: String(n), max: String(max) })}
    </p>
  );
}

// Inputs are controlled (not defaultValue) on purpose: React 19 resets uncontrolled fields after
// a form action, which would wipe what the admin typed whenever the server rejects a save. After a
// successful save the page remounts this form (keyed by updatedAt) with the stored values.
export default function FreeCourseForm({
  action,
  initial,
  updatedAt,
  published,
  hostName,
  hostRole,
  savedVideo,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initial: Values;
  updatedAt: string;
  published: boolean;
  hostName: string;
  hostRole: string;
  savedVideo: { libraryId: string; videoId: string } | null;
}) {
  const { t } = useLocale();
  const f = t.freeCourseAdmin;
  const uid = useId();
  const [values, setValues] = useState<Values>(initial);
  const [state, formAction] = useToastActionState(action, f.savedSuccess);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const aspectLabels: Record<VideoAspect, string> = {
    LANDSCAPE: f.aspectLandscape,
    PORTRAIT: f.aspectPortrait,
    SQUARE: f.aspectSquare,
  };

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-6">
      <input type="hidden" name="updatedAt" value={updatedAt} />

      {published && (
        <p role="note" className="rounded-lg bg-primary-light/30 px-4 py-2 text-sm text-primary-dark">
          {f.liveEditWarning}
        </p>
      )}

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>{f.sectionAccess}</legend>
        <p className="mt-2 text-sm text-ink-soft">{f.accessHelp}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-access-code`} className="mb-1 block text-sm font-medium text-ink">
              {f.accessCodeLabel} <span className="font-normal text-ink-soft">({f.requiredToPublish})</span>
            </label>
            <input
              id={`${uid}-access-code`}
              name="accessCode"
              dir="ltr"
              value={values.accessCode}
              onChange={(e) => set("accessCode", e.target.value)}
              maxLength={ACCESS_CODE_MAX_LENGTH}
              placeholder="groupe-octobre"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={`${uid}-access-code-hint`}
              className={inputClass}
            />
            <p id={`${uid}-access-code-hint`} className="mt-1 text-xs text-ink-soft">{f.accessCodeHint}</p>
          </div>
          <div>
            <label htmlFor={`${uid}-access-expires`} className="mb-1 block text-sm font-medium text-ink">
              {f.accessExpiresLabel}
            </label>
            <input
              id={`${uid}-access-expires`}
              name="accessExpiresOn"
              type="date"
              value={values.accessExpiresOn}
              onChange={(e) => set("accessExpiresOn", e.target.value)}
              aria-describedby={`${uid}-access-expires-hint`}
              className={inputClass}
            />
            <p id={`${uid}-access-expires-hint`} className="mt-1 text-xs text-ink-soft">{f.accessExpiresHint}</p>
          </div>
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>{f.sectionInfo}</legend>
        <div className="mt-2 grid gap-4">
          <div>
            <label htmlFor={`${uid}-eyebrow`} className="mb-1 block text-sm font-medium text-ink">
              {f.eyebrowLabel} <span className="font-normal text-ink-soft">({t.common.optional})</span>
            </label>
            <input
              id={`${uid}-eyebrow`}
              name="eyebrow"
              value={values.eyebrow}
              onChange={(e) => set("eyebrow", e.target.value)}
              maxLength={FREE_COURSE_LIMITS.eyebrow}
              aria-describedby={`${uid}-eyebrow-count`}
              className={inputClass}
            />
            <Counter id={`${uid}-eyebrow-count`} value={values.eyebrow} max={FREE_COURSE_LIMITS.eyebrow} template={f.charCount} />
          </div>

          <div>
            <label htmlFor={`${uid}-title`} className="mb-1 block text-sm font-medium text-ink">
              {f.titleLabel} <span className="font-normal text-ink-soft">({f.requiredToPublish})</span>
            </label>
            <input
              id={`${uid}-title`}
              name="title"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={FREE_COURSE_LIMITS.title}
              aria-describedby={`${uid}-title-hint ${uid}-title-count`}
              className={inputClass}
            />
            <p id={`${uid}-title-hint`} className="mt-1 text-xs text-ink-soft">{f.titleHint}</p>
            <Counter id={`${uid}-title-count`} value={values.title} max={FREE_COURSE_LIMITS.title} template={f.charCount} />
          </div>

          <div>
            <label htmlFor={`${uid}-introduction`} className="mb-1 block text-sm font-medium text-ink">
              {f.introductionLabel} <span className="font-normal text-ink-soft">({f.requiredToPublish})</span>
            </label>
            <textarea
              id={`${uid}-introduction`}
              name="introduction"
              rows={10}
              value={values.introduction}
              onChange={(e) => set("introduction", e.target.value)}
              maxLength={FREE_COURSE_LIMITS.introduction}
              aria-describedby={`${uid}-introduction-hint ${uid}-introduction-count`}
              className={`${inputClass} leading-relaxed`}
            />
            <p id={`${uid}-introduction-hint`} className="mt-1 text-xs text-ink-soft">{f.introductionHint}</p>
            <Counter
              id={`${uid}-introduction-count`}
              value={values.introduction}
              max={FREE_COURSE_LIMITS.introduction}
              template={f.charCount}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>{f.sectionVideo}</legend>
        <p className="mt-2 text-sm text-ink-soft">{f.videoHelp}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label htmlFor={`${uid}-reference`} className="mb-1 block text-sm font-medium text-ink">
              {f.referenceLabel} <span className="font-normal text-ink-soft">({f.requiredToPublish})</span>
            </label>
            <input
              id={`${uid}-reference`}
              name="bunnyReference"
              dir="ltr"
              value={values.bunnyReference}
              onChange={(e) => set("bunnyReference", e.target.value)}
              placeholder="https://iframe.mediadelivery.net/embed/…"
              autoComplete="off"
              spellCheck={false}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-library`} className="mb-1 block text-sm font-medium text-ink">
              {f.libraryIdLabel}
            </label>
            <input
              id={`${uid}-library`}
              name="bunnyLibraryId"
              dir="ltr"
              inputMode="numeric"
              value={values.bunnyLibraryId}
              onChange={(e) => set("bunnyLibraryId", e.target.value)}
              autoComplete="off"
              aria-describedby={`${uid}-library-hint`}
              className={inputClass}
            />
            <p id={`${uid}-library-hint`} className="mt-1 text-xs text-ink-soft">{f.libraryIdHint}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          {savedVideo ? (
            <span dir="auto">
              {interpolate(f.savedVideo, { library: savedVideo.libraryId, video: savedVideo.videoId })}
            </span>
          ) : (
            f.noSavedVideo
          )}
        </p>
        <p className="mt-1 text-xs text-ink-soft">{f.videoCaveat} {f.clearVideoHint}</p>

        <div className="mt-4 max-w-xs">
          <label htmlFor={`${uid}-aspect`} className="mb-1 block text-sm font-medium text-ink">{f.aspectLabel}</label>
          <select
            id={`${uid}-aspect`}
            name="videoAspect"
            value={values.videoAspect}
            onChange={(e) => set("videoAspect", e.target.value as VideoAspect)}
            className={inputClass}
          >
            {VIDEO_ASPECTS.map((aspect) => (
              <option key={aspect} value={aspect}>{aspectLabels[aspect]}</option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              name="allowSkipping"
              checked={values.allowSkipping}
              onChange={(e) => set("allowSkipping", e.target.checked)}
              aria-describedby={`${uid}-skipping-hint`}
              className="h-4 w-4 accent-primary"
            />
            {f.allowSkippingLabel}
          </label>
          <p id={`${uid}-skipping-hint`} className="mt-1 text-xs text-ink-soft">
            {values.allowSkipping ? f.allowSkippingOnHint : f.allowSkippingOffHint}
          </p>
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>{f.sectionHost}</legend>
        <label className="mt-2 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="showHost"
            checked={values.showHost}
            onChange={(e) => set("showHost", e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {f.showHostLabel}
        </label>
        <p className="mt-2 text-xs text-ink-soft">{interpolate(f.hostHint, { name: hostName, role: hostRole })}</p>
        <div className="mt-4">
          <label htmlFor={`${uid}-host-intro`} className="mb-1 block text-sm font-medium text-ink">
            {f.hostIntroLabel} <span className="font-normal text-ink-soft">({t.common.optional})</span>
          </label>
          <textarea
            id={`${uid}-host-intro`}
            name="hostIntro"
            rows={2}
            value={values.hostIntro}
            onChange={(e) => set("hostIntro", e.target.value)}
            maxLength={FREE_COURSE_LIMITS.hostIntro}
            aria-describedby={`${uid}-host-intro-count`}
            className={inputClass}
          />
          <Counter id={`${uid}-host-intro-count`} value={values.hostIntro} max={FREE_COURSE_LIMITS.hostIntro} template={f.charCount} />
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>{f.sectionSeo}</legend>
        <div className="mt-2 grid gap-4">
          <div>
            <label htmlFor={`${uid}-seo-title`} className="mb-1 block text-sm font-medium text-ink">
              {f.seoTitleLabel} <span className="font-normal text-ink-soft">({t.common.optional})</span>
            </label>
            <input
              id={`${uid}-seo-title`}
              name="seoTitle"
              value={values.seoTitle}
              onChange={(e) => set("seoTitle", e.target.value)}
              maxLength={FREE_COURSE_LIMITS.seoTitle}
              aria-describedby={`${uid}-seo-title-hint`}
              className={inputClass}
            />
            <p id={`${uid}-seo-title-hint`} className="mt-1 text-xs text-ink-soft">
              {f.seoTitleHint} {interpolate(f.charCount, { n: String(textLength(values.seoTitle)), max: String(FREE_COURSE_LIMITS.seoTitle) })}
            </p>
          </div>
          <div>
            <label htmlFor={`${uid}-seo-description`} className="mb-1 block text-sm font-medium text-ink">
              {f.seoDescriptionLabel} <span className="font-normal text-ink-soft">({t.common.optional})</span>
            </label>
            <textarea
              id={`${uid}-seo-description`}
              name="seoDescription"
              rows={2}
              value={values.seoDescription}
              onChange={(e) => set("seoDescription", e.target.value)}
              maxLength={FREE_COURSE_LIMITS.seoDescription}
              aria-describedby={`${uid}-seo-description-hint`}
              className={inputClass}
            />
            <p id={`${uid}-seo-description-hint`} className="mt-1 text-xs text-ink-soft">
              {f.seoDescriptionHint}{" "}
              {interpolate(f.charCount, {
                n: String(textLength(values.seoDescription)),
                max: String(FREE_COURSE_LIMITS.seoDescription),
              })}
            </p>
          </div>
          <p className="text-xs text-ink-soft">{f.noIndexNote}</p>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        {state.error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{state.error}</p>
        )}
        <div>
          <FormSubmitButton
            label={t.admin.save}
            pendingLabel={t.admin.saving}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-cream hover:bg-primary-dark"
          />
        </div>
      </div>
    </form>
  );
}
