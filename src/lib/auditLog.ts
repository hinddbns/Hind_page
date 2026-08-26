import { randomUUID } from "node:crypto";
import { db } from "@/lib/supabase/db";

export async function recordAuditLog({
  actorId,
  action,
  targetType,
  targetId,
  metadata,
}: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  // Prisma generated `id` client-side via cuid() — there's no equivalent Postgres-level default
  // on this column, so a direct insert has to supply one itself. randomUUID() (already used
  // elsewhere in this codebase, e.g. admin/actions.ts's uploaded-file naming) is the standard
  // stand-in; the column is a plain TEXT primary key with no format requirement.
  const { error } = await db.from("AuditLog").insert({
    id: randomUUID(),
    actorId,
    action,
    targetType,
    targetId,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
  if (error) throw error;
}
