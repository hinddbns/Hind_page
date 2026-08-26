import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db, pgTimestampToDate } from "@/lib/supabase/db";
import {
  getApprovedEnrollment,
  getLessonsWithAccess,
  isQuestionnaireComplete,
} from "@/lib/lessonAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireVerifiedSession } from "@/lib/authGuard";

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
  const { session, response } = await requireVerifiedSession();
  if (response) return response;

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
  const { data: lesson, error: lessonError } = await db
    .from("Lesson")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();
  if (lessonError) throw lessonError;
  if (!lesson) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const enrollment = await getApprovedEnrollment(session.user.id, lesson.courseId);
  if (enrollment?.status !== "APPROVED") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: courseWithLessons, error: courseError } = await db
    .from("Course")
    .select("*, lessons:Lesson(*), questions:Question(*, options:QuestionOption(*))")
    .eq("id", lesson.courseId)
    .order("order", { referencedTable: "lessons", ascending: true })
    .order("order", { referencedTable: "questions", ascending: true })
    .order("order", { referencedTable: "questions.options", ascending: true })
    .maybeSingle();
  if (courseError) throw courseError;
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
  const { data: existing, error: existingError } = await db
    .from("LessonProgress")
    .select("*")
    .eq("userId", session.user.id)
    .eq("lessonId", lessonId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (!lesson.videoPath) {
    const event = typeof body?.event === "string" ? body.event : "";
    if (event !== MANUAL_COMPLETE_EVENT) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    if (existing?.completed) {
      return NextResponse.json({ ok: true, completed: existing.completed });
    }

    const now = new Date().toISOString();
    if (existing) {
      const { data, error } = await db
        .from("LessonProgress")
        .update({ completed: true, completedAt: now, updatedAt: now })
        .eq("userId", session.user.id)
        .eq("lessonId", lessonId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, completed: data.completed });
    }

    const { data, error } = await db
      .from("LessonProgress")
      .insert({
        id: randomUUID(),
        userId: session.user.id,
        lessonId,
        courseId: lesson.courseId,
        completed: true,
        completedAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, completed: data.completed });
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
    ? Math.max(MIN_ELAPSED_SECONDS, (now.getTime() - pgTimestampToDate(existing.updatedAt).getTime()) / 1000)
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

  // Prisma's upsert had distinct create/update payloads (notably `undefined` on
  // update to mean "keep existing"). Since `existing` is already loaded, every
  // column is resolved to its final value here, so one payload serves both the
  // INSERT and the UPDATE branch.
  const resolved = {
    furthestSeconds: Math.round(newFurthest),
    lastPositionSeconds: Math.round(lastPosition),
    durationSeconds: duration !== null ? Math.round(duration) : null,
    completed,
    completedAt: completed
      ? wasCompleted && existing
        ? existing.completedAt
        : now.toISOString()
      : null,
    updatedAt: now.toISOString(),
  };

  let progress;
  if (existing) {
    const { data, error } = await db
      .from("LessonProgress")
      .update(resolved)
      .eq("userId", session.user.id)
      .eq("lessonId", lessonId)
      .select()
      .single();
    if (error) throw error;
    progress = data;
  } else {
    const insertRes = await db
      .from("LessonProgress")
      .insert({
        id: randomUUID(),
        userId: session.user.id,
        lessonId,
        courseId: lesson.courseId,
        ...resolved,
      })
      .select()
      .single();
    if (insertRes.error) {
      // A concurrent request created the row between our read and this write —
      // fall back to an update, matching how Prisma's upsert resolved the race.
      if (insertRes.error.code !== "23505") throw insertRes.error;
      const { data, error } = await db
        .from("LessonProgress")
        .update(resolved)
        .eq("userId", session.user.id)
        .eq("lessonId", lessonId)
        .select()
        .single();
      if (error) throw error;
      progress = data;
    } else {
      progress = insertRes.data;
    }
  }

  return NextResponse.json({
    ok: true,
    completed: progress.completed,
    furthestSeconds: progress.furthestSeconds,
    lastPositionSeconds: progress.lastPositionSeconds,
  });
}
