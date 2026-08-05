import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";

export default async function AdminMessagesInboxPage() {
  const { t } = await getT();

  const allMessages = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  const seen = new Set<string>();
  const conversations = [];
  const unreadByUser = new Map<string, boolean>();
  for (const m of allMessages) {
    if (!seen.has(m.userId)) {
      seen.add(m.userId);
      conversations.push(m);
    }
    if (
      m.sender === "USER" &&
      (!m.user.messagesReadByAdminAt || m.createdAt > m.user.messagesReadByAdminAt)
    ) {
      unreadByUser.set(m.userId, true);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">{t.messages.adminInboxTitle}</h1>

      {conversations.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">{t.messages.adminInboxEmpty}</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {conversations.map((m) => {
            const isUnread = unreadByUser.get(m.userId) ?? false;
            return (
              <Link
                key={m.userId}
                href={`/admin/messages/${m.userId}`}
                className="flex items-center justify-between rounded-2xl border border-primary-light/50 bg-white p-5 transition hover:border-primary"
              >
                <div className="flex items-center gap-2">
                  {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />}
                  <div>
                    <p className="font-medium text-ink">{m.user.name}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-ink-soft">
                      {m.sender === "ADMIN" ? `${t.messages.you}: ` : ""}
                      {m.body}
                    </p>
                  </div>
                </div>
                <span className="whitespace-nowrap text-xs text-ink-soft/70">
                  {m.createdAt.toLocaleDateString("ar-MA")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
