import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getApprovedEnrollment,
  getLessonsWithAccess,
  isQuestionnaireComplete,
} from "@/lib/lessonAccess";
import { checkRateLimit } from "@/lib/rateLimit";

// A lesson with no locally-hosted video (external link or text-only) has no
// timeline we can validate, so it's completed by explicit student action
// instead of playback tracking.
const MANUAL_COMPLETE_EVENT = "complete";

// How far furthestSeconds is allowed to advance per request, relative to real
// elapsed time since the last accepted update. >1 leaves room for heartbeat
// jitter and the playback-rate allowance without permitting one-shot jumps to
// the end of the video.
const RATE_MULTIPLIER = 2;
const MIN_ELAPSED_SECONDS = 1;
const ENDED_GRACE_SECONDS = 3;
const MAX_POSITION_SECONDS = 24 * 60 * 60;
const COMPLETION_RATIO = 0.9;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Admin previews aren't real student progress — nothing to record.
  if (session.user.role === "ADMIN") {
    return NextResponse.json({ ok: true });
  }

  // Generous relative to the ~12/min legitimate heartbeat cadence — this is
  // volume/DoS protection, not the forgery defense (that's the rate-limited
  // furthestSeconds math below, which holds regardless of request volume).
  const withinRateLimit = await checkRateLimit(`progress:${session.user.id}`, 60, 60);
  if (!withinRateLimit) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const enrollment = await getApprovedEnrollment(session.user.id, lesson.courseId);
  if (enrollment?.status !== "APPROVED") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const courseWithLessons = await prisma.course.findUnique({
    where: { id: lesson.courseId },
    include: {
      lessons: { orderBy: { order: "asc" } },
      questions: { include: { options: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
    },
  });
  if (!courseWithLessons) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const questionnaireDone = await isQuestionnaireComplete(courseWithLessons, session.user.id);
  if (!questionnaireDone) {
    return NextResponse.json({ error: "questionnaire_incomplete" }, { status: 403 });
  }

  const lessonsWithAccess = await getLessonsWithAccess(
    courseWithLessons.id,
    session.user.id,
    courseWithLessons.lessons
  );
  const target = lessonsWithAccess.find((l) => l.id === lessonId);
  if (!target || target.state === "locked") {
    return NextResponse.json({ error: "locked" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
  });

  if (!lesson.videoPath) {
    const event = typeof body?.event === "string" ? body.event : "";
    if (event !== MANUAL_COMPLETE_EVENT) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const now = new Date();
    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: session.user.id, lessonId } },
      create: {
        userId: session.user.id,
        lessonId,
        courseId: lesson.courseId,
        completed: true,
        completedAt: now,
      },
      update: existing?.completed ? {} : { completed: true, completedAt: now },
    });

    return NextResponse.json({ ok: true, completed: progress.completed });
  }

  const reportedPosition =
    typeof body?.positionSeconds === "number" && Number.isFinite(body.positionSeconds)
      ? Math.max(0, Math.min(body.positionSeconds, MAX_POSITION_SECONDS))
      : null;
  const reportedDuration =
    typeof body?.durationSeconds === "number" &&
    Number.isFinite(body.durationSeconds) &&
    body.durationSeconds > 0
      ? Math.min(body.durationSeconds, MAX_POSITION_SECONDS)
      : null;
  const event = typeof body?.event === "string" ? body.event : "heartbeat";

  if (reportedPosition === null) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const duration = reportedDuration ?? existing?.durationSeconds ?? null;
  const now = new Date();

  // A fresh row has no prior update to measure elapsed time against — treat
  // it as having just been created (minimum elapsed), rather than granting a
  // separate flat allowance that a single forged request could exploit to
  // instantly "complete" a short video.
  const baseFurthest = existing?.furthestSeconds ?? 0;
  const elapsedSeconds = existing
    ? Math.max(MIN_ELAPSED_SECONDS, (now.getTime() - existing.updatedAt.getTime()) / 1000)
    : MIN_ELAPSED_SECONDS;
  const allowed = baseFurthest + elapsedSeconds * RATE_MULTIPLIER;
  let newFurthest = Math.max(baseFurthest, Math.min(reportedPosition, allowed));
  if (duration !== null) newFurthest = Math.min(newFurthest, duration);

  const lastPosition = duration !== null ? Math.min(reportedPosition, duration) : reportedPosition;

  const wasCompleted = existing?.completed ?? false;
  const reachedByPercent = duration !== null && newFurthest >= duration * COMPLETION_RATIO;
  const reachedByEnded =
    event === "ended" &&
    (duration === null || newFurthest >= duration - ENDED_GRACE_SECONDS);
  const completed = wasCompleted || reachedByPercent || reachedByEnded;

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
    create: {
      userId: session.user.id,
      lessonId,
      courseId: lesson.courseId,
      furthestSeconds: Math.round(newFurthest),
      lastPositionSeconds: Math.round(lastPosition),
      durationSeconds: duration !== null ? Math.round(duration) : null,
      completed,
      completedAt: completed ? now : null,
    },
    update: {
      furthestSeconds: Math.round(newFurthest),
      lastPositionSeconds: Math.round(lastPosition),
      durationSeconds: duration !== null ? Math.round(duration) : undefined,
      completed,
      completedAt: completed && !wasCompleted ? now : undefined,
    },
  });

  return NextResponse.json({
    ok: true,
    completed: progress.completed,
    furthestSeconds: progress.furthestSeconds,
    lastPositionSeconds: progress.lastPositionSeconds,
  });
}
