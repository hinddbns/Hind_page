import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/session";
import { db } from "@/lib/supabase/db";
import { getT } from "@/i18n/server";
import ChatPanel from "@/components/ChatPanel";

export default async function UserMessagesPage() {
  const user = await getAppUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/messages");
  if (user.role === "ADMIN") redirect("/admin/messages");

  const { t } = await getT();

  const { data: settings, error } = await db
    .from("Settings")
    .upsert({ id: "main" }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">{t.messages.title}</h1>
      <p className="mt-2 text-ink-soft">{t.messages.subtitle}</p>
      <p className="mt-1 text-xs text-ink-soft/80">
        {t.messages.availabilityLabel}: {settings.availability}
      </p>

      <div className="mt-6">
        <ChatPanel targetUserId={user.id} isAdmin={false} />
      </div>
    </div>
  );
}
