"use client";

import { useEffect, useId, useRef } from "react";
import type { SocialPlatform, SocialSurface } from "@prisma/client";
import type { ActionState } from "@/app/(app)/admin/actions";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToastActionState } from "@/lib/useToastActionState";
import FormSubmitButton from "@/components/admin/FormSubmitButton";
import ConfirmActionForm from "./ConfirmActionForm";

const SURFACES: SocialSurface[] = ["GLOBAL", "PARENTS", "ADOLESCENTS"];

function PlatformSection({
  label,
  configs,
  createAction,
  deleteAction,
}: {
  label: string;
  configs: { id: string; url: string; surfaces: SocialSurface[] }[];
  createAction: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  deleteAction: (id: string, prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const { t } = useLocale();
  const [state, formAction] = useToastActionState(createAction, t.admin.socialLinkCreatedSuccess);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  const surfaceLabel: Record<SocialSurface, string> = {
    GLOBAL: t.admin.socialSurfaceGlobal,
    PARENTS: t.admin.socialSurfaceParents,
    ADOLESCENTS: t.admin.socialSurfaceAdolescents,
  };

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="rounded-2xl border border-primary-light/50 bg-white p-5">
      <h3 className="font-serif text-lg text-ink">{label}</h3>

      {configs.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{t.admin.socialLinkNoConfigs}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {configs.map((config) => (
            <li
              key={config.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-light/40 bg-cream-dark/30 px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink" title={config.url}>{config.url}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {config.surfaces.map((surface) => (
                    <span
                      key={surface}
                      className="rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-xs text-secondary"
                    >
                      {surfaceLabel[surface]}
                    </span>
                  ))}
                </div>
              </div>
              <ConfirmActionForm
                action={deleteAction.bind(null, config.id)}
                confirmMessage={t.admin.confirmDeleteSocialLink}
                successMessage={t.admin.socialLinkDeletedSuccess}
                label={t.admin.delete}
                pendingLabel={t.admin.deleting}
                className="shrink-0 rounded-full border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
              />
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor={`${uid}-url`} className="mb-1 block text-sm font-medium text-ink">
            {t.admin.socialLinkUrlLabel}
          </label>
          <input
            id={`${uid}-url`}
            name="url"
            type="url"
            required
            placeholder="https://..."
            className="w-full rounded-lg border border-primary-light px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium text-ink">{t.admin.socialLinkSurfacesLabel}</legend>
          <div className="flex flex-wrap gap-3">
            {SURFACES.map((surface) => (
              <label key={surface} className="flex items-center gap-1.5 text-sm text-ink-soft">
                <input type="checkbox" name="surfaces" value={surface} className="h-4 w-4 rounded border-primary-light text-primary" />
                {surfaceLabel[surface]}
              </label>
            ))}
          </div>
        </fieldset>
        <FormSubmitButton
          label={t.admin.socialLinkAddBtn}
          pendingLabel={t.admin.saving}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-cream hover:bg-primary-dark"
        />
      </form>
      {state.error && (
        <p role="alert" className="mt-2 rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{state.error}</p>
      )}
    </div>
  );
}

export default function SocialLinksForm({
  platforms,
  createAction,
  deleteAction,
}: {
  platforms: {
    platform: SocialPlatform;
    label: string;
    configs: { id: string; url: string; surfaces: SocialSurface[] }[];
  }[];
  createAction: (platform: SocialPlatform, prevState: ActionState, formData: FormData) => Promise<ActionState>;
  deleteAction: (id: string, prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const { t } = useLocale();

  return (
    <div className="mt-8">
      <h2 className="font-serif text-xl text-ink">{t.admin.socialLinksTitle}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t.admin.socialLinksHint}</p>
      <div className="mt-4 flex flex-col gap-4">
        {platforms.map(({ platform, label, configs }) => (
          <PlatformSection
            key={platform}
            label={label}
            configs={configs}
            createAction={createAction.bind(null, platform)}
            deleteAction={deleteAction}
          />
        ))}
      </div>
    </div>
  );
}
