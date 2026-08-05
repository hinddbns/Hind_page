import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import ChatPanel from "@/components/ChatPanel";

export default async function AdminMessageThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { t } = await getT();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  return (
    <div>
      <Link href="/admin/messages" className="text-sm font-medium text-primary hover:underline">
        {t.messages.backToInbox}
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-ink">{user.name}</h1>
      <p className="text-sm text-ink-soft">{user.email}</p>

      <div className="mt-6">
        <ChatPanel targetUserId={user.id} isAdmin placeholder={t.messages.adminReplyPlaceholder} />
      </div>
    </div>
  );
}
