import { prisma } from "@/lib/prisma";

/**
 * Simple DB-backed sliding-window rate limiter — no external infra, works
 * across the stateless serverless instances a Postgres-backed Next.js app
 * runs on. Returns true if the request is allowed (and records it), false if
 * the caller is over the limit for this key in the current window.
 */
export async function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  await prisma.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: windowStart } } });

  const count = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: windowStart } } });
  if (count >= maxRequests) return false;

  await prisma.rateLimitHit.create({ data: { key } });
  return true;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
