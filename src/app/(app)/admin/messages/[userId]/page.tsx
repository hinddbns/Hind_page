import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase/db";
import { getT } from "@/i18n/server";
import ChatPanel from "@/components/ChatPanel";

export default async function AdminMessageThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { t } = await getT();

  const { data: user, error } = await db.from("User").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
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
