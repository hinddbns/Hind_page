import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/supabase/db";
import { getT } from "@/i18n/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireVerifiedSession } from "@/lib/authGuard";

export async function GET(req: Request) {
  const { session, response } = await requireVerifiedSession();
  if (response) return response;

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

  const { data: messages, error: messagesError } = await db
    .from("Message")
    .select("*")
    .eq("userId", targetUserId)
    .order("createdAt", { ascending: true });
  if (messagesError) throw messagesError;

  if (session.user.role === "ADMIN") {
    const { error } = await db
      .from("User")
      .update({ messagesReadByAdminAt: new Date().toISOString() })
      .eq("id", targetUserId);
    if (error) throw error;
  } else {
    const { error } = await db
      .from("User")
      .update({ messagesReadByUserAt: new Date().toISOString() })
      .eq("id", session.user.id);
    if (error) throw error;
  }

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const { session, response } = await requireVerifiedSession();
  if (response) return response;

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
    const { data: message, error } = await db
      .from("Message")
      .insert({ id: randomUUID(), userId: targetUserId, sender: "ADMIN", body: text })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ message });
  }

  const { count, error: countError } = await db
    .from("Message")
    .select("*", { count: "exact", head: true })
    .eq("userId", session.user.id);
  if (countError) throw countError;
  const isFirstMessage = (count ?? 0) === 0;

  const { data: message, error: createError } = await db
    .from("Message")
    .insert({ id: randomUUID(), userId: session.user.id, sender: "USER", body: text })
    .select()
    .single();
  if (createError) throw createError;

  if (isFirstMessage) {
    const { t } = await getT();
    const { error: autoReplyError } = await db
      .from("Message")
      .insert({ id: randomUUID(), userId: session.user.id, sender: "SYSTEM", body: t.messages.autoReply });
    if (autoReplyError) throw autoReplyError;
  }

  return NextResponse.json({ message });
}
