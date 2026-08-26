import type { Enums } from "@/lib/supabase/database.types";
import { db } from "@/lib/supabase/db";

type SocialPlatform = Enums<"SocialPlatform">;
import { getT } from "@/i18n/server";
import { updateSettings, updateWhatsAppNumber, createSocialLink, deleteSocialLink } from "../actions";
import SettingsForm from "@/components/admin/SettingsForm";
import SocialLinksForm from "@/components/admin/SocialLinksForm";

// WhatsApp is deliberately excluded here: it drives the site-wide floating
// WhatsApp button (via Settings.whatsappNumber, edited below) instead of
// being one more icon in the footer's social-icon row like the others.
const SOCIAL_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "TIKTOK"];

const AUDIT_ACTION_LABEL_KEY = {
  ENROLLMENT_APPROVED: "auditActionEnrollmentApproved",
  ENROLLMENT_REJECTED: "auditActionEnrollmentRejected",
  USER_PROMOTED: "auditActionUserPromoted",
  USER_DEMOTED: "auditActionUserDemoted",
} as const;

export default async function AdminSettingsPage() {
  const { t } = await getT();

  const { data: settings, error: settingsError } = await db
    .from("Settings")
    .upsert({ id: "main" }, { onConflict: "id" })
    .select()
    .single();
  if (settingsError) throw settingsError;

  const { data: logs, error: logsError } = await db
    .from("AuditLog")
    .select("*, actor:User(name)")
    .order("createdAt", { ascending: false })
    .limit(30);
  if (logsError) throw logsError;

  const { data: socialLinks, error: socialLinksError } = await db
    .from("SocialLink")
    .select("*, assignments:SocialLinkAssignment(*)")
    .order("createdAt", { ascending: true });
  if (socialLinksError) throw socialLinksError;

  const platformLabel: Record<SocialPlatform, string> = {
    INSTAGRAM: t.admin.socialPlatformInstagram,
    FACEBOOK: t.admin.socialPlatformFacebook,
    YOUTUBE: t.admin.socialPlatformYoutube,
    TIKTOK: t.admin.socialPlatformTiktok,
    WHATSAPP: t.admin.socialPlatformWhatsapp,
  };

  const socialPlatformGroups = SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    label: platformLabel[platform],
    configs: socialLinks
      .filter((link) => link.platform === platform)
      .map((link) => ({
        id: link.id,
        url: link.url,
        surfaces: link.assignments.map((a) => a.surface),
      })),
  }));

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">{t.admin.settingsTitle}</h1>
      <SettingsForm
        action={updateSettings}
        successMessage={t.admin.saved}
        fieldId="settings-availability"
        fieldName="availability"
        fieldLabel={t.admin.availabilityLabel}
        initialValue={settings.availability}
      />
      <SettingsForm
        action={updateWhatsAppNumber}
        successMessage={t.admin.whatsappNumberSaved}
        fieldId="settings-whatsapp-number"
        fieldName="whatsappNumber"
        fieldLabel={t.admin.whatsappNumberLabel}
        fieldHint={t.admin.whatsappNumberHint}
        initialValue={settings.whatsappNumber}
      />

      <SocialLinksForm
        platforms={socialPlatformGroups}
        createAction={createSocialLink}
        deleteAction={deleteSocialLink}
      />

      <div className="mt-10">
        <h2 className="font-serif text-lg text-ink">{t.admin.auditLogTitle}</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">{t.admin.auditLogEmpty}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {logs.map((log) => {
              const labelKey = AUDIT_ACTION_LABEL_KEY[log.action as keyof typeof AUDIT_ACTION_LABEL_KEY];
              return (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary-light/40 bg-white px-4 py-2.5 text-sm"
                >
                  <span className="text-ink">
                    <span className="font-medium">{log.actor.name}</span>{" "}
                    {labelKey ? t.admin[labelKey] : log.action}
                  </span>
                  <span className="text-xs text-ink-soft">
                    {new Date(log.createdAt).toLocaleString("ar-MA")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
