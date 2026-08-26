import { NextResponse } from "next/server";
import path from "node:path";
import { db } from "@/lib/supabase/db";
import { downloadReceipt } from "@/lib/receiptStorage";
import { requireVerifiedSession } from "@/lib/authGuard";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const { session, response } = await requireVerifiedSession();
  if (response) return response;

  const { enrollmentId } = await params;
  const { data: enrollment, error } = await db.from("Enrollment").select("*").eq("id", enrollmentId).maybeSingle();
  if (error) throw error;
  if (!enrollment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isOwner = enrollment.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ext = path.extname(enrollment.receiptPath).toLowerCase();
  const buffer = await downloadReceipt(enrollment.receiptPath);
  if (!buffer) {
    return NextResponse.json({ error: "file_not_found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
