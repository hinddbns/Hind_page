import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import ChatPanel from "@/components/ChatPanel";

export default async function UserMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?next=/tableau-de-bord/messages");
  if (session.user.role === "ADMIN") redirect("/admin/messages");

  const { t } = await getT();

  const settings = await prisma.settings.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main" },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">{t.messages.title}</h1>
      <p className="mt-2 text-ink-soft">{t.messages.subtitle}</p>
      <p className="mt-1 text-xs text-ink-soft/80">
        {t.messages.availabilityLabel}: {settings.availability}
      </p>

      <div className="mt-6">
        <ChatPanel targetUserId={session.user.id} isAdmin={false} />
      </div>
    </div>
  );
}
