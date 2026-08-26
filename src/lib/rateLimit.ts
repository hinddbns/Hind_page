import { randomUUID } from "node:crypto";
import { db } from "@/lib/supabase/db";

/**
 * Simple DB-backed sliding-window rate limiter — no external infra, works
 * across the stateless serverless instances a Postgres-backed Next.js app
 * runs on. Returns true if the request is allowed (and records it), false if
 * the caller is over the limit for this key in the current window.
 */
export async function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { error: deleteError } = await db.from("RateLimitHit").delete().eq("key", key).lt("createdAt", windowStart);
  if (deleteError) throw deleteError;

  const { count, error: countError } = await db
    .from("RateLimitHit")
    .select("*", { count: "exact", head: true })
    .eq("key", key)
    .gte("createdAt", windowStart);
  if (countError) throw countError;
  if ((count ?? 0) >= maxRequests) return false;

  // Prisma generated `id` client-side via cuid() — no Postgres-level default on this column, so
  // a direct insert has to supply one itself (see the identical note in lib/auditLog.ts).
  const { error: insertError } = await db.from("RateLimitHit").insert({ id: randomUUID(), key });
  if (insertError) throw insertError;

  return true;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
