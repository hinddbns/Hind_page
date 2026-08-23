import { prisma } from "@/lib/prisma";

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
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
