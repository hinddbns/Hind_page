"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { interpolate } from "@/i18n/config";

export default function UnreadBadge({ enabled = true }: { enabled?: boolean }) {
  const { t } = useLocale();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    async function poll() {
      const res = await fetch("/api/messages/unread-count");
      if (res.ok && active) {
        const data = await res.json();
        setCount(data.count ?? 0);
      }
    }
    poll();
    const interval = setInterval(poll, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [enabled]);

  if (!count) return null;

  return (
    <span className="ms-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold text-cream">
      <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
      <span className="sr-only">{interpolate(t.common.unreadMessagesCount, { n: String(count) })}</span>
    </span>
  );
}
