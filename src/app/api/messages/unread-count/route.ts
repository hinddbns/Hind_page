import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/db";
import { requireVerifiedSession } from "@/lib/authGuard";

const EPOCH = new Date(0).toISOString();

export async function GET() {
  const { session, response } = await requireVerifiedSession();
  if (response) return response;

  if (session.user.role === "ADMIN") {
    const { data: users, error: usersError } = await db
      .from("User")
      .select("id, messagesReadByAdminAt")
      .eq("role", "USER");
    if (usersError) throw usersError;

    let count = 0;
    for (const u of users) {
      const { count: userUnread, error: countError } = await db
        .from("Message")
        .select("*", { count: "exact", head: true })
        .eq("userId", u.id)
        .eq("sender", "USER")
        .gt("createdAt", u.messagesReadByAdminAt ?? EPOCH);
      if (countError) throw countError;
      count += userUnread ?? 0;
    }

    return NextResponse.json({ count });
  }

  const { data: me, error: meError } = await db
    .from("User")
    .select("messagesReadByUserAt")
    .eq("id", session.user.id)
    .maybeSingle();
  if (meError) throw meError;

  const { count, error: countError } = await db
    .from("Message")
    .select("*", { count: "exact", head: true })
    .eq("userId", session.user.id)
    .in("sender", ["ADMIN", "SYSTEM"])
    .gt("createdAt", me?.messagesReadByUserAt ?? EPOCH);
  if (countError) throw countError;

  return NextResponse.json({ count: count ?? 0 });
}
