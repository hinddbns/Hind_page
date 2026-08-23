import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const queryUserId = searchParams.get("userId");

  let targetUserId: string;
  if (session.user.role === "ADMIN") {
    if (!queryUserId) {
      return NextResponse.json({ error: "user_id_required" }, { status: 400 });
    }
    targetUserId = queryUserId;
  } else {
    targetUserId = session.user.id;
  }

  const messages = await prisma.message.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: "asc" },
  });

  if (session.user.role === "ADMIN") {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { messagesReadByAdminAt: new Date() },
    });
  } else {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { messagesReadByUserAt: new Date() },
    });
  }

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`message:${session.user.id}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  if (session.user.role === "ADMIN") {
    const targetUserId = typeof body?.userId === "string" ? body.userId : "";
    if (!targetUserId) {
      return NextResponse.json({ error: "user_id_required" }, { status: 400 });
    }
    const message = await prisma.message.create({
      data: { userId: targetUserId, sender: "ADMIN", body: text },
    });
    return NextResponse.json({ message });
  }

  const isFirstMessage = (await prisma.message.count({ where: { userId: session.user.id } })) === 0;

  const message = await prisma.message.create({
    data: { userId: session.user.id, sender: "USER", body: text },
  });

  if (isFirstMessage) {
    const { t } = await getT();
    await prisma.message.create({
      data: { userId: session.user.id, sender: "SYSTEM", body: t.messages.autoReply },
    });
  }

  return NextResponse.json({ message });
}
