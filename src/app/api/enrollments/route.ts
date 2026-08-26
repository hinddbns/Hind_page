import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/supabase/db";
import { requireVerifiedSession } from "@/lib/authGuard";
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_SIZE, extensionForMime } from "@/lib/uploads";
import { matchesFileSignature } from "@/lib/fileSignature";
import { checkRateLimit } from "@/lib/rateLimit";
import { uploadReceipt, deleteReceipt } from "@/lib/receiptStorage";

export async function POST(req: Request) {
  const { session, response } = await requireVerifiedSession();
  if (response) return response;

  const allowed = await checkRateLimit(`enrollment:${session.user.id}`, 10, 60 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const courseId = formData.get("courseId");
  const note = formData.get("note");
  const file = formData.get("receipt");
  const hasFile = file instanceof File && file.size > 0;

  if (typeof courseId !== "string" || !courseId) {
    return NextResponse.json({ error: "course_not_found" }, { status: 400 });
  }

  const { data: course, error: courseError } = await db.from("Course").select("*").eq("id", courseId).maybeSingle();
  if (courseError) throw courseError;
  if (!course || !course.published) {
    return NextResponse.json({ error: "course_not_found" }, { status: 404 });
  }

  const { data: existing, error: existingError } = await db
    .from("Enrollment")
    .select("*")
    .eq("userId", session.user.id)
    .eq("courseId", courseId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing && existing.status === "APPROVED") {
    return NextResponse.json({ error: "already_approved" }, { status: 409 });
  }
  if (existing && existing.status === "PENDING") {
    return NextResponse.json({ error: "already_pending" }, { status: 409 });
  }

  if (!hasFile && !existing) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  let filename = existing?.receiptPath;

  if (hasFile) {
    const uploadedFile = file as File;
    if (!ALLOWED_RECEIPT_TYPES.has(uploadedFile.type)) {
      return NextResponse.json({ error: "unsupported_format" }, { status: 400 });
    }
    if (uploadedFile.size > MAX_RECEIPT_SIZE) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }

    const buffer = Buffer.from(await uploadedFile.arrayBuffer());
    if (!matchesFileSignature(uploadedFile.type, buffer)) {
      return NextResponse.json({ error: "unsupported_format" }, { status: 400 });
    }

    filename = `${randomUUID()}${extensionForMime(uploadedFile.type)}`;
    await uploadReceipt(filename, buffer, uploadedFile.type);

    if (existing) {
      await deleteReceipt(existing.receiptPath);
    }
  }

  const noteValue = typeof note === "string" && note.trim() ? note.trim().slice(0, 500) : undefined;

  let enrollment: { id: string; status: "PENDING" | "APPROVED" | "REJECTED" };
  if (existing) {
    // Prisma's `undefined` on a field omits it from the UPDATE (leaving the
    // existing value untouched) — unlike explicitly passing `null`, which
    // would clear it. Only include receiptNote in the payload when a new
    // note was actually given, to replicate that omission behavior.
    const { data, error } = await db
      .from("Enrollment")
      .update({
        status: "PENDING",
        receiptPath: filename!,
        reviewedAt: null,
        ...(noteValue !== undefined ? { receiptNote: noteValue } : {}),
      })
      .eq("id", existing.id)
      .select("id, status")
      .single();
    if (error) throw error;
    enrollment = data;
  } else {
    const { data, error } = await db
      .from("Enrollment")
      .insert({
        id: randomUUID(),
        userId: session.user.id,
        courseId,
        receiptPath: filename!,
        receiptNote: noteValue ?? null,
      })
      .select("id, status")
      .single();
    if (error) throw error;
    enrollment = data;
  }

  return NextResponse.json({ id: enrollment.id, status: enrollment.status });
}

export async function DELETE(req: Request) {
  const { session, response } = await requireVerifiedSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const enrollmentId = searchParams.get("id");
  if (!enrollmentId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data: enrollment, error: enrollmentError } = await db
    .from("Enrollment")
    .select("*")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (enrollmentError) throw enrollmentError;
  if (!enrollment || enrollment.userId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (enrollment.status === "APPROVED") {
    return NextResponse.json({ error: "cannot_cancel_approved" }, { status: 409 });
  }

  await deleteReceipt(enrollment.receiptPath);
  const { error: deleteError } = await db.from("Enrollment").delete().eq("id", enrollmentId);
  if (deleteError) throw deleteError;

  return NextResponse.json({ ok: true });
}
