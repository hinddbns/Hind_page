import type { Tables } from "@/lib/supabase/database.types";
import { db, pgTimestampToDate } from "@/lib/supabase/db";

export type LessonAccessState = "completed" | "current" | "locked";

export type CourseWithLessons = Tables<"Course"> & {
  lessons: Tables<"Lesson">[];
  questions: (Tables<"Question"> & { options: Tables<"QuestionOption">[] })[];
};

export async function getStudentCourse(slug: string): Promise<CourseWithLessons | null> {
  const { data, error } = await db
    .from("Course")
    .select("*, lessons:Lesson(*), questions:Question(*, options:QuestionOption(*))")
    .eq("slug", slug)
    .order("order", { referencedTable: "lessons", ascending: true })
    .order("order", { referencedTable: "questions", ascending: true })
    .order("order", { referencedTable: "questions.options", ascending: true })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getApprovedEnrollment(userId: string, courseId: string) {
  const { data, error } = await db
    .from("Enrollment")
    .select("*")
    .eq("userId", userId)
    .eq("courseId", courseId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLessonProgressRecord(userId: string, lessonId: string) {
  const { data, error } = await db
    .from("LessonProgress")
    .select("*")
    .eq("userId", userId)
    .eq("lessonId", lessonId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function isQuestionnaireComplete(course: CourseWithLessons, userId: string): Promise<boolean> {
  if (!course.questionnaireEnabled || course.questions.length === 0) return true;
  const { count, error } = await db
    .from("QuestionAnswer")
    .select("*", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("courseId", course.id);
  if (error) throw error;
  return (count ?? 0) >= course.questions.length;
}

/**
 * First non-completed lesson (in order) is "current"; everything after it is "locked".
 * Completed lessons stay accessible regardless of position, so replay always works.
 */
export async function getLessonsWithAccess(
  courseId: string,
  userId: string,
  lessons: Tables<"Lesson">[]
): Promise<(Tables<"Lesson"> & { state: LessonAccessState })[]> {
  const { data: progress, error } = await db
    .from("LessonProgress")
    .select("lessonId, completed")
    .eq("userId", userId)
    .eq("courseId", courseId);
  if (error) throw error;
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));

  let currentAssigned = false;
  return lessons.map((lesson) => {
    if (completedIds.has(lesson.id)) return { ...lesson, state: "completed" as const };
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...lesson, state: "current" as const };
    }
    return { ...lesson, state: "locked" as const };
  });
}

export type CourseProgressSummary = {
  totalLessons: number;
  completedLessons: number;
  percent: number;
  currentLessonId: string | null;
  currentLessonTitle: string | null;
  isComplete: boolean;
  lastActivityAt: Date | null;
};

export async function getCourseProgressSummary(
  courseId: string,
  userId: string
): Promise<CourseProgressSummary> {
  const { data: lessons, error: lessonsError } = await db
    .from("Lesson")
    .select("*")
    .eq("courseId", courseId)
    .order("order", { ascending: true });
  if (lessonsError) throw lessonsError;
  const lessonsWithAccess = await getLessonsWithAccess(courseId, userId, lessons);

  const totalLessons = lessons.length;
  const completedLessons = lessonsWithAccess.filter((l) => l.state === "completed").length;
  const current = lessonsWithAccess.find((l) => l.state === "current");
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isComplete = totalLessons > 0 && completedLessons === totalLessons;

  const { data: lastProgress, error: lastProgressError } = await db
    .from("LessonProgress")
    .select("updatedAt")
    .eq("userId", userId)
    .eq("courseId", courseId)
    .order("updatedAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastProgressError) throw lastProgressError;

  return {
    totalLessons,
    completedLessons,
    percent,
    currentLessonId: current?.id ?? null,
    currentLessonTitle: current?.title ?? null,
    isComplete,
    lastActivityAt: lastProgress ? pgTimestampToDate(lastProgress.updatedAt) : null,
  };
}
