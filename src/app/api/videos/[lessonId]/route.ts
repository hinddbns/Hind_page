import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { VIDEOS_DIR } from "@/lib/uploads";
import { getApprovedEnrollment, getLessonsWithAccess, isQuestionnaireComplete } from "@/lib/lessonAccess";
import { requireVerifiedSession } from "@/lib/authGuard";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
  ".mov": "video/quicktime",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { session, response } = await requireVerifiedSession();
  if (response) return response;

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || !lesson.videoPath) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN") {
    const enrollment = await getApprovedEnrollment(session.user.id, lesson.courseId);
    if (enrollment?.status !== "APPROVED") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // A course/direct-URL fetch of a video that isn't unlocked yet — the lesson
    // page itself redirects away from this, but this is the actual byte
    // source, so it has to enforce the same lock independently.
    const course = await prisma.course.findUnique({
      where: { id: lesson.courseId },
      include: {
        lessons: { orderBy: { order: "asc" } },
        questions: { include: { options: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
      },
    });
    if (!course) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const questionnaireDone = await isQuestionnaireComplete(course, session.user.id);
    if (!questionnaireDone) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const lessonsWithAccess = await getLessonsWithAccess(course.id, session.user.id, course.lessons);
    const target = lessonsWithAccess.find((l) => l.id === lessonId);
    if (!target || target.state === "locked") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const filePath = path.join(VIDEOS_DIR, lesson.videoPath);
  const ext = path.extname(lesson.videoPath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  let fileSize: number;
  try {
    fileSize = (await stat(filePath)).size;
  } catch {
    return NextResponse.json({ error: "file_not_found" }, { status: 404 });
  }

  const range = req.headers.get("range");

  if (!range) {
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match?.[1] ? parseInt(match[1], 10) : 0;
  const end = match?.[2] ? parseInt(match[2], 10) : fileSize - 1;
  const chunkSize = end - start + 1;

  const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;

  return new NextResponse(stream, {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(chunkSize),
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
