import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import { updateSettings } from "../actions";
import SettingsForm from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const { t } = await getT();

  const settings = await prisma.settings.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main" },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">{t.admin.settingsTitle}</h1>
      <SettingsForm action={updateSettings} initialAvailability={settings.availability} />
    </div>
  );
}
