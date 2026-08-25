import type { SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import { updateSettings, createSocialLink, deleteSocialLink } from "../actions";
import SettingsForm from "@/components/admin/SettingsForm";
import SocialLinksForm from "@/components/admin/SocialLinksForm";

const SOCIAL_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "TIKTOK", "WHATSAPP"];

const AUDIT_ACTION_LABEL_KEY = {
  ENROLLMENT_APPROVED: "auditActionEnrollmentApproved",
  ENROLLMENT_REJECTED: "auditActionEnrollmentRejected",
  USER_PROMOTED: "auditActionUserPromoted",
  USER_DEMOTED: "auditActionUserDemoted",
} as const;

export default async function AdminSettingsPage() {
  const { t } = await getT();

  const settings = await prisma.settings.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main" },
  });

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { actor: { select: { name: true } } },
  });

  const socialLinks = await prisma.socialLink.findMany({
    include: { assignments: true },
    orderBy: { createdAt: "asc" },
  });

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
      <SettingsForm action={updateSettings} initialAvailability={settings.availability} />

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
                    {log.createdAt.toLocaleString("ar-MA")}
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
