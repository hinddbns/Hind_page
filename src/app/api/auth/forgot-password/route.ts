import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/emailTemplates";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  const allowed = await checkRateLimit(`forgot-password:${clientIp(req)}`, 5, 60 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  // Always the same response regardless of whether the account exists, so this
  // endpoint can't be used to discover which emails have accounts.
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
      });

      const resetUrl = `${new URL(req.url).origin}/reinitialiser-mot-de-passe?token=${rawToken}`;
      await sendEmail({ to: user.email, ...passwordResetEmail({ name: user.name, resetUrl }) });
    }
  }

  return NextResponse.json({ ok: true });
}
