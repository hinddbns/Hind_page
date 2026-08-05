"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function UnreadBadge() {
  const { data: session } = useSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;

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
  }, [session?.user]);

  if (!count) return null;

  return (
    <span className="ms-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold text-cream">
      {count > 9 ? "9+" : count}
    </span>
  );
}
