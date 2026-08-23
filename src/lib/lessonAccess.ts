import type { Course, Lesson, Question, QuestionOption } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LessonAccessState = "completed" | "current" | "locked";

export type CourseWithLessons = Course & {
  lessons: Lesson[];
  questions: (Question & { options: QuestionOption[] })[];
};

export function getStudentCourse(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    include: {
      lessons: { orderBy: { order: "asc" } },
      questions: { include: { options: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
    },
  });
}

export function getApprovedEnrollment(userId: string, courseId: string) {
  return prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
}

export function getLessonProgressRecord(userId: string, lessonId: string) {
  return prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
}

export async function isQuestionnaireComplete(course: CourseWithLessons, userId: string): Promise<boolean> {
  if (!course.questionnaireEnabled || course.questions.length === 0) return true;
  const answered = await prisma.questionAnswer.count({
    where: { userId, courseId: course.id },
  });
  return answered >= course.questions.length;
}

/**
 * First non-completed lesson (in order) is "current"; everything after it is "locked".
 * Completed lessons stay accessible regardless of position, so replay always works.
 */
export async function getLessonsWithAccess(
  courseId: string,
  userId: string,
  lessons: Lesson[]
): Promise<(Lesson & { state: LessonAccessState })[]> {
  const progress = await prisma.lessonProgress.findMany({ where: { userId, courseId } });
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
  const lessons = await prisma.lesson.findMany({ where: { courseId }, orderBy: { order: "asc" } });
  const lessonsWithAccess = await getLessonsWithAccess(courseId, userId, lessons);

  const totalLessons = lessons.length;
  const completedLessons = lessonsWithAccess.filter((l) => l.state === "completed").length;
  const current = lessonsWithAccess.find((l) => l.state === "current");
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isComplete = totalLessons > 0 && completedLessons === totalLessons;

  const lastProgress = await prisma.lessonProgress.findFirst({
    where: { userId, courseId },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  return {
    totalLessons,
    completedLessons,
    percent,
    currentLessonId: current?.id ?? null,
    currentLessonTitle: current?.title ?? null,
    isComplete,
    lastActivityAt: lastProgress?.updatedAt ?? null,
  };
}
