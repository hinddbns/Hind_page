import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, messagesReadByAdminAt: true },
    });

    let count = 0;
    for (const u of users) {
      count += await prisma.message.count({
        where: {
          userId: u.id,
          sender: "USER",
          createdAt: { gt: u.messagesReadByAdminAt ?? new Date(0) },
        },
      });
    }

    return NextResponse.json({ count });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { messagesReadByUserAt: true },
  });

  const count = await prisma.message.count({
    where: {
      userId: session.user.id,
      sender: { in: ["ADMIN", "SYSTEM"] },
      createdAt: { gt: me?.messagesReadByUserAt ?? new Date(0) },
    },
  });

  return NextResponse.json({ count });
}
