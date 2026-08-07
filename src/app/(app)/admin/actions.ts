"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { QuestionType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ALLOWED_VIDEO_TYPES,
  DEMO_VIDEOS_DIR,
  DEMO_VIDEOS_PUBLIC_PREFIX,
  MAX_VIDEO_SIZE,
  VIDEOS_DIR,
  extensionForMime,
} from "@/lib/uploads";
import { matchesFileSignature } from "@/lib/fileSignature";

export type ActionState = { error?: string; ok?: boolean };

class AdminActionError extends Error {}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new AdminActionError("غير مصرح به.");
  }
  return session;
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function saveVideoIfPresent(formData: FormData, key: string, dir: string) {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    throw new AdminActionError("صيغة فيديو غير مدعومة (يجب أن تكون MP4 أو WebM أو OGG أو MOV).");
  }
  if (file.size > MAX_VIDEO_SIZE) {
    throw new AdminActionError("حجم الفيديو يتجاوز الحد الأقصى المسموح به (150 ميغابايت).");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesFileSignature(file.type, buffer)) {
    throw new AdminActionError("صيغة فيديو غير مدعومة (يجب أن تكون MP4 أو WebM أو OGG أو MOV).");
  }
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}${extensionForMime(file.type)}`;
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}

async function deleteFileQuietly(dir: string, filename: string | null | undefined) {
  if (!filename) return;
  await unlink(path.join(dir, filename)).catch(() => {});
}

/** Wraps an admin mutation so expected failures (auth, validation) become a
 * result the UI can show inline, instead of crashing to the error boundary. */
async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AdminActionError) return { error: e.message };
    throw e;
  }
}

export async function reviewEnrollment(
  enrollmentId: string,
  status: "APPROVED" | "REJECTED",
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status, reviewedAt: new Date() },
    });
    revalidatePath("/admin/demandes");
    revalidatePath("/admin");
    return { ok: true };
  });
}

export async function createCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const title = readString(formData, "title");
    const slug = readString(formData, "slug");
    const summary = readString(formData, "summary");
    const description = readString(formData, "description");
    const demoVideoUrl = readString(formData, "demoVideoUrl");
    const price = Number(formData.get("price") ?? 0);
    const audienceRaw = readString(formData, "audience");
    const audience = audienceRaw === "ADOLESCENT" ? "ADOLESCENT" : "PARENT_TEACHER";

    if (!title || !slug || !summary || !description || !Number.isFinite(price)) {
      return { error: "حقول غير صالحة." };
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { error: "المعرّف (slug) يجب أن يحتوي فقط على حروف لاتينية صغيرة وأرقام وشرطات." };
    }

    const existingSlug = await prisma.course.findUnique({ where: { slug } });
    if (existingSlug) {
      return { error: "هذا المعرّف (slug) مستخدم بالفعل. اختر معرّفًا آخر." };
    }

    const demoVideoFilename = await saveVideoIfPresent(formData, "demoVideoFile", DEMO_VIDEOS_DIR);

    await prisma.course.create({
      data: {
        title,
        slug,
        summary,
        description,
        price: Math.round(price),
        audience,
        demoVideoUrl: demoVideoUrl || undefined,
        demoVideoPath: demoVideoFilename ? `${DEMO_VIDEOS_PUBLIC_PREFIX}/${demoVideoFilename}` : undefined,
      },
    });

    revalidatePath("/admin/cours");
    revalidatePath("/cours");
    revalidatePath("/");
    return { ok: true };
  });
}

export async function updateCourse(
  courseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const title = readString(formData, "title");
    const summary = readString(formData, "summary");
    const description = readString(formData, "description");
    const demoVideoUrl = readString(formData, "demoVideoUrl");
    const price = Number(formData.get("price") ?? 0);
    const audienceRaw = readString(formData, "audience");
    const audience = audienceRaw === "ADOLESCENT" ? "ADOLESCENT" : "PARENT_TEACHER";

    if (!title || !summary || !description || !Number.isFinite(price)) {
      return { error: "حقول غير صالحة." };
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return { error: "الدورة غير موجودة." };

    const demoVideoFilename = await saveVideoIfPresent(formData, "demoVideoFile", DEMO_VIDEOS_DIR);
    if (demoVideoFilename) {
      await deleteFileQuietly(DEMO_VIDEOS_DIR, path.basename(course.demoVideoPath ?? ""));
    }

    await prisma.course.update({
      where: { id: courseId },
      data: {
        title,
        summary,
        description,
        price: Math.round(price),
        audience,
        demoVideoUrl: demoVideoUrl || null,
        demoVideoPath: demoVideoFilename
          ? `${DEMO_VIDEOS_PUBLIC_PREFIX}/${demoVideoFilename}`
          : course.demoVideoPath,
      },
    });

    revalidatePath("/admin/cours");
    revalidatePath(`/admin/cours/${courseId}`);
    revalidatePath("/cours");
    revalidatePath("/");
    return { ok: true };
  });
}

export async function toggleCoursePublished(
  courseId: string,
  published: boolean,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    await prisma.course.update({ where: { id: courseId }, data: { published } });
    revalidatePath("/admin/cours");
    revalidatePath("/cours");
    revalidatePath("/");
    return { ok: true };
  });
}

export async function deleteCourse(
  courseId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { lessons: true, _count: { select: { enrollments: true } } },
    });
    if (!course) return { ok: true };

    if (course._count.enrollments > 0) {
      throw new AdminActionError(
        "لا يمكن حذف هذه الدورة لوجود طلبات تسجيل و/أو دفعات لعملاء مرتبطة بها. استخدم «إلغاء النشر» لإخفائها عن الزوار الجدد مع الاحتفاظ بسجلات العملاء."
      );
    }

    // Guard the actual delete with the same condition at the database level, so a
    // brand-new enrollment created after the check above (but before this runs)
    // can't be silently wiped out by a race — the delete only takes effect if the
    // course still has zero enrollments at this exact moment.
    const result = await prisma.course.deleteMany({
      where: { id: courseId, enrollments: { none: {} } },
    });
    if (result.count === 0) {
      throw new AdminActionError(
        "لا يمكن حذف هذه الدورة لوجود طلبات تسجيل و/أو دفعات لعملاء مرتبطة بها. استخدم «إلغاء النشر» لإخفائها عن الزوار الجدد مع الاحتفاظ بسجلات العملاء."
      );
    }

    await deleteFileQuietly(DEMO_VIDEOS_DIR, path.basename(course.demoVideoPath ?? ""));
    for (const lesson of course.lessons) {
      await deleteFileQuietly(VIDEOS_DIR, lesson.videoPath);
    }

    revalidatePath("/admin/cours");
    revalidatePath("/cours");
    revalidatePath("/");
    return { ok: true };
  });
}

export async function addLesson(
  courseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const title = readString(formData, "title");
    const content = readString(formData, "content");
    const videoUrl = readString(formData, "videoUrl");
    const order = Number(formData.get("order") ?? 0);

    if (!title || !content) {
      return { error: "حقول غير صالحة." };
    }

    const videoFilename = await saveVideoIfPresent(formData, "videoFile", VIDEOS_DIR);

    await prisma.lesson.create({
      data: {
        courseId,
        title,
        content,
        videoUrl: videoUrl || undefined,
        videoPath: videoFilename || undefined,
        order: Number.isFinite(order) ? Math.round(order) : 0,
      },
    });

    revalidatePath(`/admin/cours/${courseId}`);
    revalidatePath(`/tableau-de-bord/cours`);
    return { ok: true };
  });
}

export async function updateLesson(
  lessonId: string,
  courseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const title = readString(formData, "title");
    const content = readString(formData, "content");
    const videoUrl = readString(formData, "videoUrl");
    const order = Number(formData.get("order") ?? 0);

    if (!title || !content) {
      return { error: "حقول غير صالحة." };
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return { error: "الدرس غير موجود." };

    const videoFilename = await saveVideoIfPresent(formData, "videoFile", VIDEOS_DIR);
    if (videoFilename) {
      await deleteFileQuietly(VIDEOS_DIR, lesson.videoPath);
    }

    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title,
        content,
        videoUrl: videoUrl || null,
        videoPath: videoFilename || lesson.videoPath,
        order: Number.isFinite(order) ? Math.round(order) : lesson.order,
      },
    });

    revalidatePath(`/admin/cours/${courseId}`);
    return { ok: true };
  });
}

export async function deleteLesson(
  lessonId: string,
  courseId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (lesson) await deleteFileQuietly(VIDEOS_DIR, lesson.videoPath);
    await prisma.lesson.delete({ where: { id: lessonId } });
    revalidatePath(`/admin/cours/${courseId}`);
    return { ok: true };
  });
}

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const availability = readString(formData, "availability");

    await prisma.settings.upsert({
      where: { id: "main" },
      update: { availability },
      create: { id: "main", availability },
    });

    revalidatePath("/admin/parametres");
    revalidatePath("/tableau-de-bord/messages");
    return { ok: true };
  });
}

export async function promoteToAdmin(
  userId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
    revalidatePath("/admin/utilisateurs");
    revalidatePath(`/admin/utilisateurs/${userId}`);
    return { ok: true };
  });
}

export async function demoteToUser(
  userId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireAdmin();

    if (session.user.id === userId) {
      return { error: "لا يمكنك إزالة صلاحيات المسؤول عن نفسك." };
    }

    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "لا يمكن إزالة آخر حساب مسؤول متبقٍ." };
    }

    await prisma.user.update({ where: { id: userId }, data: { role: "USER" } });
    revalidatePath("/admin/utilisateurs");
    revalidatePath(`/admin/utilisateurs/${userId}`);
    return { ok: true };
  });
}

export async function toggleQuestionnaire(
  courseId: string,
  enabled: boolean,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    await prisma.course.update({ where: { id: courseId }, data: { questionnaireEnabled: enabled } });
    revalidatePath(`/admin/cours/${courseId}/questionnaire`);
    revalidatePath(`/admin/cours/${courseId}`);
    revalidatePath(`/tableau-de-bord/cours`);
    return { ok: true };
  });
}

const OPTION_SLOTS = 6;

function readOptions(formData: FormData) {
  const options: { label: string; order: number }[] = [];
  for (let i = 1; i <= OPTION_SLOTS; i++) {
    const label = readString(formData, `option${i}`);
    if (label) {
      options.push({ label, order: i });
    }
  }
  return options;
}

function readScaleFields(formData: FormData): ActionState & {
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
} {
  const scaleMin = Number(formData.get("scaleMin") ?? 1);
  const scaleMax = Number(formData.get("scaleMax") ?? 5);
  if (!Number.isFinite(scaleMin) || !Number.isFinite(scaleMax) || scaleMin >= scaleMax) {
    return { error: "مقياس غير صالح: يجب أن تكون القيمة الدنيا أصغر من القيمة القصوى." };
  }
  return {
    scaleMin: Math.round(scaleMin),
    scaleMax: Math.round(scaleMax),
    scaleMinLabel: readString(formData, "scaleMinLabel") || null,
    scaleMaxLabel: readString(formData, "scaleMaxLabel") || null,
  };
}

export async function createQuestion(
  courseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const type = readString(formData, "type") as QuestionType;
    const text = readString(formData, "text");
    const order = Number(formData.get("order") ?? 0);

    if (!text) return { error: "نص السؤال مطلوب." };

    const isChoice = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
    const options = isChoice ? readOptions(formData) : [];
    if (isChoice && options.length < 2) {
      return { error: "أضف خيارين على الأقل." };
    }

    let scale: { scaleMin: number | null; scaleMax: number | null; scaleMinLabel: string | null; scaleMaxLabel: string | null };
    if (type === "SCALE") {
      const result = readScaleFields(formData);
      if (result.error) return { error: result.error };
      scale = {
        scaleMin: result.scaleMin!,
        scaleMax: result.scaleMax!,
        scaleMinLabel: result.scaleMinLabel ?? null,
        scaleMaxLabel: result.scaleMaxLabel ?? null,
      };
    } else {
      scale = { scaleMin: null, scaleMax: null, scaleMinLabel: null, scaleMaxLabel: null };
    }

    await prisma.question.create({
      data: {
        courseId,
        type,
        text,
        order: Number.isFinite(order) ? Math.round(order) : 0,
        ...scale,
        options: options.length ? { create: options } : undefined,
      },
    });

    revalidatePath(`/admin/cours/${courseId}/questionnaire`);
    return { ok: true };
  });
}

export async function updateQuestion(
  questionId: string,
  courseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const type = readString(formData, "type") as QuestionType;
    const text = readString(formData, "text");
    const order = Number(formData.get("order") ?? 0);

    if (!text) return { error: "نص السؤال مطلوب." };

    const isChoice = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
    const options = isChoice ? readOptions(formData) : [];
    if (isChoice && options.length < 2) {
      return { error: "أضف خيارين على الأقل." };
    }

    let scale: { scaleMin: number | null; scaleMax: number | null; scaleMinLabel: string | null; scaleMaxLabel: string | null };
    if (type === "SCALE") {
      const result = readScaleFields(formData);
      if (result.error) return { error: result.error };
      scale = {
        scaleMin: result.scaleMin!,
        scaleMax: result.scaleMax!,
        scaleMinLabel: result.scaleMinLabel ?? null,
        scaleMaxLabel: result.scaleMaxLabel ?? null,
      };
    } else {
      scale = { scaleMin: null, scaleMax: null, scaleMinLabel: null, scaleMaxLabel: null };
    }

    await prisma.questionOption.deleteMany({ where: { questionId } });

    await prisma.question.update({
      where: { id: questionId },
      data: {
        type,
        text,
        order: Number.isFinite(order) ? Math.round(order) : 0,
        ...scale,
        options: options.length ? { create: options } : undefined,
      },
    });

    revalidatePath(`/admin/cours/${courseId}/questionnaire`);
    return { ok: true };
  });
}

export async function deleteQuestion(
  questionId: string,
  courseId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    await prisma.question.delete({ where: { id: questionId } });
    revalidatePath(`/admin/cours/${courseId}/questionnaire`);
    return { ok: true };
  });
}
