"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

type Message = {
  id: string;
  sender: "USER" | "ADMIN" | "SYSTEM";
  body: string;
  createdAt: string;
};

export default function ChatPanel({
  targetUserId,
  isAdmin,
  placeholder,
}: {
  targetUserId: string;
  isAdmin: boolean;
  placeholder?: string;
}) {
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/messages?userId=${targetUserId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
    setLoaded(true);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- polling: fetch on mount then every 5s
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId, body: text.trim() }),
    });
    setSending(false);
    if (res.ok) {
      setText("");
      load();
    }
  }

  return (
    <div className="flex h-[60vh] flex-col rounded-2xl border border-primary-light/50 bg-white">
      <div className="flex-1 overflow-y-auto p-5">
        {loaded && messages.length === 0 && (
          <p className="text-center text-sm text-ink-soft">{t.messages.empty}</p>
        )}
        <div role="log" aria-live="polite" className="flex flex-col gap-3">
          {messages.map((m) => {
            const isMine = isAdmin ? m.sender === "ADMIN" : m.sender === "USER";
            const isSystem = m.sender === "SYSTEM";
            return (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  isSystem
                    ? "self-center bg-cream-dark text-ink-soft"
                    : isMine
                      ? "self-end bg-primary text-cream"
                      : "self-start bg-cream-dark text-ink"
                }`}
              >
                {m.body}
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-primary-light/40 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? t.messages.placeholder}
          aria-label={placeholder ?? t.messages.placeholder}
          className="flex-1 rounded-full border border-primary-light bg-white px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-cream hover:bg-primary-dark disabled:opacity-60"
        >
          {t.messages.send}
        </button>
      </form>
    </div>
  );
}
