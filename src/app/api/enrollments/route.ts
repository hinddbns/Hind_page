import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_SIZE, UPLOADS_DIR, extensionForMime } from "@/lib/uploads";
import { matchesFileSignature } from "@/lib/fileSignature";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
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

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !course.published) {
    return NextResponse.json({ error: "course_not_found" }, { status: 404 });
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
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

    await mkdir(UPLOADS_DIR, { recursive: true });
    filename = `${randomUUID()}${extensionForMime(uploadedFile.type)}`;
    await writeFile(path.join(UPLOADS_DIR, filename), buffer);

    if (existing) {
      await unlink(path.join(UPLOADS_DIR, existing.receiptPath)).catch(() => {});
    }
  }

  const noteValue = typeof note === "string" && note.trim() ? note.trim().slice(0, 500) : undefined;

  const enrollment = existing
    ? await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: "PENDING", receiptPath: filename!, receiptNote: noteValue, reviewedAt: null },
      })
    : await prisma.enrollment.create({
        data: {
          userId: session.user.id,
          courseId,
          receiptPath: filename!,
          receiptNote: noteValue,
        },
      });

  return NextResponse.json({ id: enrollment.id, status: enrollment.status });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const enrollmentId = searchParams.get("id");
  if (!enrollmentId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment || enrollment.userId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (enrollment.status === "APPROVED") {
    return NextResponse.json({ error: "cannot_cancel_approved" }, { status: 409 });
  }

  await unlink(path.join(UPLOADS_DIR, enrollment.receiptPath)).catch(() => {});
  await prisma.enrollment.delete({ where: { id: enrollmentId } });

  return NextResponse.json({ ok: true });
}
