"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { Enums } from "@/lib/supabase/database.types";
import { getAppUser } from "@/lib/session";
import {
  db,
  createQuestionWithOptions,
  createSocialLinkWithAssignments,
  deleteCourseIfNoEnrollments,
  updateQuestionWithOptions,
} from "@/lib/supabase/db";
import {
  ALLOWED_VIDEO_TYPES,
  DEMO_VIDEOS_DIR,
  DEMO_VIDEOS_PUBLIC_PREFIX,
  MAX_VIDEO_SIZE,
  VIDEOS_DIR,
  extensionForMime,
} from "@/lib/uploads";
import { matchesFileSignature } from "@/lib/fileSignature";
import { recordAuditLog } from "@/lib/auditLog";
import { sendEmail } from "@/lib/email";
import { enrollmentApprovedEmail, enrollmentRejectedEmail } from "@/lib/emailTemplates";
import { SUSPEND_BAN_DURATION, RESTORE_BAN_DURATION } from "@/lib/suspension";
import { parseBunnyReference, type BunnyReferenceError } from "@/lib/bunny";
import { FREE_COURSE_ID, FREE_COURSE_PATH, fetchFreeCourse } from "@/lib/freeCourse";
import {
  FREE_COURSE_LIMITS,
  getContentProblems,
  getPublishBlockers,
  isVideoAspect,
  normalizeFreeCourseContent,
  type FreeCourseContentProblem,
} from "@/lib/freeCourseRules";
import { getT } from "@/i18n/server";
import { interpolate } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";

type QuestionType = Enums<"QuestionType">;
type SocialPlatform = Enums<"SocialPlatform">;
type SocialSurface = Enums<"SocialSurface">;

export type ActionState = { error?: string; ok?: boolean };

class AdminActionError extends Error {}

async function requireAdmin() {
  const user = await getAppUser();
  if (!user || user.role !== "ADMIN") {
    throw new AdminActionError("غير مصرح به.");
  }
  return { user };
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

async function notifyEnrollmentStatus(enrollmentId: string, status: "APPROVED" | "REJECTED") {
  const { data: enrollment, error } = await db
    .from("Enrollment")
    .select("*, user:User(*), course:Course(*)")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (error) throw error;
  if (!enrollment) return;

  const emailContent =
    status === "APPROVED"
      ? enrollmentApprovedEmail({
          name: enrollment.user.name,
          courseTitle: enrollment.course.title,
          courseSlug: enrollment.course.slug,
        })
      : enrollmentRejectedEmail({
          name: enrollment.user.name,
          courseTitle: enrollment.course.title,
          courseSlug: enrollment.course.slug,
        });

  await sendEmail({ to: enrollment.user.email, ...emailContent });
}

export async function reviewEnrollment(
  enrollmentId: string,
  status: "APPROVED" | "REJECTED",
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireAdmin();
    const { error } = await db
      .from("Enrollment")
      .update({ status, reviewedAt: new Date().toISOString() })
      .eq("id", enrollmentId);
    if (error) throw error;
    await recordAuditLog({
      actorId: session.user.id,
      action: status === "APPROVED" ? "ENROLLMENT_APPROVED" : "ENROLLMENT_REJECTED",
      targetType: "Enrollment",
      targetId: enrollmentId,
    });
    await notifyEnrollmentStatus(enrollmentId, status);
    revalidatePath("/admin/demandes");
    revalidatePath("/admin");
    return { ok: true };
  });
}

export async function reviewEnrollmentsBulk(
  status: "APPROVED" | "REJECTED",
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireAdmin();
    const ids = formData.getAll("ids").map(String).filter(Boolean);
    if (ids.length === 0) {
      throw new AdminActionError("لم يتم تحديد أي طلب.");
    }
    const { error } = await db
      .from("Enrollment")
      .update({ status, reviewedAt: new Date().toISOString() })
      .in("id", ids);
    if (error) throw error;
    for (const enrollmentId of ids) {
      await recordAuditLog({
        actorId: session.user.id,
        action: status === "APPROVED" ? "ENROLLMENT_APPROVED" : "ENROLLMENT_REJECTED",
        targetType: "Enrollment",
        targetId: enrollmentId,
        metadata: { bulk: true },
      });
      await notifyEnrollmentStatus(enrollmentId, status);
    }
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
    const description = readString(formData, "description");
    const demoVideoUrl = readString(formData, "demoVideoUrl");
    const price = Number(formData.get("price") ?? 0);
    const audienceRaw = readString(formData, "audience");
    const audience = audienceRaw === "ADOLESCENT" ? "ADOLESCENT" : "PARENT_TEACHER";

    if (!title || !slug || !description || !Number.isFinite(price)) {
      return { error: "حقول غير صالحة." };
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { error: "المعرّف (slug) يجب أن يحتوي فقط على حروف لاتينية صغيرة وأرقام وشرطات." };
    }

    const { data: existingSlug, error: existingSlugError } = await db
      .from("Course")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existingSlugError) throw existingSlugError;
    if (existingSlug) {
      return { error: "هذا المعرّف (slug) مستخدم بالفعل. اختر معرّفًا آخر." };
    }

    const demoVideoFilename = await saveVideoIfPresent(formData, "demoVideoFile", DEMO_VIDEOS_DIR);

    const { error: createError } = await db.from("Course").insert({
      id: randomUUID(),
      title,
      slug,
      description,
      price: Math.round(price),
      audience,
      demoVideoUrl: demoVideoUrl || undefined,
      demoVideoPath: demoVideoFilename ? `${DEMO_VIDEOS_PUBLIC_PREFIX}/${demoVideoFilename}` : undefined,
    });
    if (createError) throw createError;

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
    const description = readString(formData, "description");
    const demoVideoUrl = readString(formData, "demoVideoUrl");
    const price = Number(formData.get("price") ?? 0);
    const audienceRaw = readString(formData, "audience");
    const audience = audienceRaw === "ADOLESCENT" ? "ADOLESCENT" : "PARENT_TEACHER";

    if (!title || !description || !Number.isFinite(price)) {
      return { error: "حقول غير صالحة." };
    }

    const { data: course, error: courseError } = await db.from("Course").select("*").eq("id", courseId).maybeSingle();
    if (courseError) throw courseError;
    if (!course) return { error: "الدورة غير موجودة." };

    const demoVideoFilename = await saveVideoIfPresent(formData, "demoVideoFile", DEMO_VIDEOS_DIR);
    if (demoVideoFilename) {
      await deleteFileQuietly(DEMO_VIDEOS_DIR, path.basename(course.demoVideoPath ?? ""));
    }

    const { error: updateError } = await db
      .from("Course")
      .update({
        title,
        description,
        price: Math.round(price),
        audience,
        demoVideoUrl: demoVideoUrl || null,
        demoVideoPath: demoVideoFilename
          ? `${DEMO_VIDEOS_PUBLIC_PREFIX}/${demoVideoFilename}`
          : course.demoVideoPath,
      })
      .eq("id", courseId);
    if (updateError) throw updateError;

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
    const { error } = await db.from("Course").update({ published }).eq("id", courseId);
    if (error) throw error;
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

    const { data: course, error: courseError } = await db
      .from("Course")
      .select("*, lessons:Lesson(*), enrollments:Enrollment(count)")
      .eq("id", courseId)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) return { ok: true };

    if ((course.enrollments[0]?.count ?? 0) > 0) {
      throw new AdminActionError(
        "لا يمكن حذف هذه الدورة لوجود طلبات تسجيل و/أو دفعات لعملاء مرتبطة بها. استخدم «إلغاء النشر» لإخفائها عن الزوار الجدد مع الاحتفاظ بسجلات العملاء."
      );
    }

    // Guard the actual delete with the same condition at the database level, so a
    // brand-new enrollment created after the check above (but before this runs)
    // can't be silently wiped out by a race — the delete only takes effect if the
    // course still has zero enrollments at this exact moment. This is the atomic
    // Postgres function from Phase 1 (delete_course_if_no_enrollments), not a
    // second select-then-delete that could itself race.
    const { deleted } = await deleteCourseIfNoEnrollments(courseId);
    if (!deleted) {
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

    const { error } = await db.from("Lesson").insert({
      id: randomUUID(),
      courseId,
      title,
      content,
      videoUrl: videoUrl || undefined,
      videoPath: videoFilename || undefined,
      order: Number.isFinite(order) ? Math.round(order) : 0,
    });
    if (error) throw error;

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

    const { data: lesson, error: lessonError } = await db.from("Lesson").select("*").eq("id", lessonId).maybeSingle();
    if (lessonError) throw lessonError;
    if (!lesson) return { error: "الدرس غير موجود." };

    const videoFilename = await saveVideoIfPresent(formData, "videoFile", VIDEOS_DIR);
    if (videoFilename) {
      await deleteFileQuietly(VIDEOS_DIR, lesson.videoPath);
    }

    const { error: updateError } = await db
      .from("Lesson")
      .update({
        title,
        content,
        videoUrl: videoUrl || null,
        videoPath: videoFilename || lesson.videoPath,
        order: Number.isFinite(order) ? Math.round(order) : lesson.order,
      })
      .eq("id", lessonId);
    if (updateError) throw updateError;

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
    const { data: lesson, error: lessonError } = await db.from("Lesson").select("*").eq("id", lessonId).maybeSingle();
    if (lessonError) throw lessonError;
    if (lesson) await deleteFileQuietly(VIDEOS_DIR, lesson.videoPath);
    const { error: deleteError } = await db.from("Lesson").delete().eq("id", lessonId);
    if (deleteError) throw deleteError;
    revalidatePath(`/admin/cours/${courseId}`);
    return { ok: true };
  });
}

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const availability = readString(formData, "availability");

    const { error } = await db.from("Settings").upsert({ id: "main", availability }, { onConflict: "id" });
    if (error) throw error;

    revalidatePath("/admin/parametres");
    revalidatePath("/tableau-de-bord/messages");
    return { ok: true };
  });
}

export async function updateWhatsAppNumber(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const whatsappNumber = readString(formData, "whatsappNumber").replace(/[\s+()-]/g, "");

    if (!/^\d{8,15}$/.test(whatsappNumber)) {
      throw new AdminActionError(
        "رقم واتساب غير صالح. أدخل رمز الدولة والرقم بدون + أو مسافات (مثال: 212612345678)."
      );
    }

    const { error } = await db.from("Settings").upsert({ id: "main", whatsappNumber }, { onConflict: "id" });
    if (error) throw error;

    // The floating WhatsApp button lives in the root layout, so it applies
    // to every route — revalidate the layout itself rather than one path.
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function promoteToAdmin(
  userId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireAdmin();
    const { error } = await db.from("User").update({ role: "ADMIN" }).eq("id", userId);
    if (error) throw error;
    await recordAuditLog({
      actorId: session.user.id,
      action: "USER_PROMOTED",
      targetType: "User",
      targetId: userId,
    });
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

    const { count: adminCount, error: countError } = await db
      .from("User")
      .select("*", { count: "exact", head: true })
      .eq("role", "ADMIN");
    if (countError) throw countError;
    if ((adminCount ?? 0) <= 1) {
      return { error: "لا يمكن إزالة آخر حساب مسؤول متبقٍ." };
    }

    const { error: updateError } = await db.from("User").update({ role: "USER" }).eq("id", userId);
    if (updateError) throw updateError;
    await recordAuditLog({
      actorId: session.user.id,
      action: "USER_DEMOTED",
      targetType: "User",
      targetId: userId,
    });
    revalidatePath("/admin/utilisateurs");
    revalidatePath(`/admin/utilisateurs/${userId}`);
    return { ok: true };
  });
}

export async function suspendUser(
  userId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireAdmin();

    if (session.user.id === userId) {
      return { error: "لا يمكنك تعليق حسابك الخاص." };
    }

    const { data: target, error: targetError } = await db
      .from("User")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return { error: "المستخدم غير موجود." };

    // Suspension is a Supabase Auth ban only — no change to public.User (role
    // included), enrollments, progress, messages or uploads — so it is fully
    // reversible by unsuspendUser below.
    const { error } = await db.auth.admin.updateUserById(userId, { ban_duration: SUSPEND_BAN_DURATION });
    if (error) throw error;

    await recordAuditLog({
      actorId: session.user.id,
      action: "USER_SUSPENDED",
      targetType: "User",
      targetId: userId,
    });
    revalidatePath("/admin/utilisateurs");
    revalidatePath(`/admin/utilisateurs/${userId}`);
    return { ok: true };
  });
}

export async function unsuspendUser(
  userId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireAdmin();

    const { error } = await db.auth.admin.updateUserById(userId, { ban_duration: RESTORE_BAN_DURATION });
    if (error) throw error;

    await recordAuditLog({
      actorId: session.user.id,
      action: "USER_UNSUSPENDED",
      targetType: "User",
      targetId: userId,
    });
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
    const { error } = await db.from("Course").update({ questionnaireEnabled: enabled }).eq("id", courseId);
    if (error) throw error;
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

    await createQuestionWithOptions(
      courseId,
      { type, text, order: Number.isFinite(order) ? Math.round(order) : 0, ...scale },
      options
    );

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

    await updateQuestionWithOptions(
      questionId,
      { type, text, order: Number.isFinite(order) ? Math.round(order) : 0, ...scale },
      options
    );

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
    const { error } = await db.from("Question").delete().eq("id", questionId);
    if (error) throw error;
    revalidatePath(`/admin/cours/${courseId}/questionnaire`);
    return { ok: true };
  });
}

const SOCIAL_SURFACE_LABEL_AR: Record<SocialSurface, string> = {
  GLOBAL: "عام",
  PARENTS: "الأمهات والأستاذات",
  ADOLESCENTS: "الشباب والمراهقين",
};

function revalidateSocialLinkSurfaces() {
  revalidatePath("/admin/parametres");
  revalidatePath("/");
  revalidatePath("/ados");
  revalidatePath("/parents-enseignants");
}

export async function createSocialLink(
  platform: SocialPlatform,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const url = readString(formData, "url");
    try {
      new URL(url);
    } catch {
      throw new AdminActionError("الرابط غير صالح. يجب أن يبدأ بـ https:// أو http://");
    }

    const surfaces = formData.getAll("surfaces").map(String) as SocialSurface[];
    if (surfaces.length === 0) {
      throw new AdminActionError("يجب اختيار نطاق واحد على الأقل.");
    }

    const { data: conflicts, error: conflictsError } = await db
      .from("SocialLinkAssignment")
      .select("*")
      .eq("platform", platform)
      .in("surface", surfaces);
    if (conflictsError) throw conflictsError;
    if (conflicts.length > 0) {
      const labels = conflicts.map((c) => SOCIAL_SURFACE_LABEL_AR[c.surface]).join("، ");
      throw new AdminActionError(`هذا النطاق مخصص بالفعل لرابط آخر لنفس المنصة: ${labels}.`);
    }

    await createSocialLinkWithAssignments(platform, url, surfaces);

    revalidateSocialLinkSurfaces();
    return { ok: true };
  });
}

export async function deleteSocialLink(
  linkId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const { error } = await db.from("SocialLink").delete().eq("id", linkId);
    if (error) throw error;
    revalidateSocialLinkSurfaces();
    return { ok: true };
  });
}

function bunnyReferenceMessage(error: BunnyReferenceError, t: Dictionary) {
  const messages: Record<BunnyReferenceError, string> = {
    missing_library_id: t.freeCourseAdmin.errorMissingLibraryId,
    invalid_library_id: t.freeCourseAdmin.errorInvalidLibraryId,
    invalid_video_id: t.freeCourseAdmin.errorInvalidVideoId,
    unsupported_url: t.freeCourseAdmin.errorUnsupportedUrl,
    library_id_mismatch: t.freeCourseAdmin.errorLibraryIdMismatch,
  };
  return messages[error];
}

function freeCourseContentMessage(problem: FreeCourseContentProblem, t: Dictionary) {
  const tooLong = (template: string, max: number) => interpolate(template, { max: String(max) });
  const messages: Record<FreeCourseContentProblem, string> = {
    titleTooLong: tooLong(t.freeCourseAdmin.errorTitleTooLong, FREE_COURSE_LIMITS.title),
    eyebrowTooLong: tooLong(t.freeCourseAdmin.errorEyebrowTooLong, FREE_COURSE_LIMITS.eyebrow),
    introductionTooLong: tooLong(t.freeCourseAdmin.errorIntroductionTooLong, FREE_COURSE_LIMITS.introduction),
    hostIntroTooLong: tooLong(t.freeCourseAdmin.errorHostIntroTooLong, FREE_COURSE_LIMITS.hostIntro),
    seoTitleTooLong: tooLong(t.freeCourseAdmin.errorSeoTitleTooLong, FREE_COURSE_LIMITS.seoTitle),
    seoDescriptionTooLong: tooLong(t.freeCourseAdmin.errorSeoDescriptionTooLong, FREE_COURSE_LIMITS.seoDescription),
    invalidLibraryId: t.freeCourseAdmin.errorInvalidLibraryId,
    invalidVideoId: t.freeCourseAdmin.errorInvalidVideoId,
    invalidVideoAspect: t.freeCourseAdmin.errorInvalidVideoAspect,
  };
  return messages[problem];
}

// Postgres check_violation — the FreeCourse CHECK constraints (lengths, ID formats, publish
// completeness) backing up the application-level validation above them.
const PG_CHECK_VIOLATION = "23514";

function revalidateFreeCourse() {
  revalidatePath("/admin/cours-gratuit");
  revalidatePath(FREE_COURSE_PATH);
}

export async function updateFreeCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireAdmin();
    const { t } = await getT();

    const reference = parseBunnyReference(readString(formData, "bunnyReference"), readString(formData, "bunnyLibraryId"));
    if (!reference.ok) throw new AdminActionError(bunnyReferenceMessage(reference.error, t));

    const videoAspect = readString(formData, "videoAspect");
    if (!isVideoAspect(videoAspect)) throw new AdminActionError(t.freeCourseAdmin.errorInvalidVideoAspect);

    const content = normalizeFreeCourseContent({
      title: readString(formData, "title"),
      eyebrow: readString(formData, "eyebrow"),
      introduction: String(formData.get("introduction") ?? ""),
      bunnyLibraryId: reference.libraryId,
      bunnyVideoId: reference.videoId,
      videoAspect,
      allowSkipping: formData.get("allowSkipping") === "on",
      showHost: formData.get("showHost") === "on",
      hostIntro: readString(formData, "hostIntro"),
      seoTitle: readString(formData, "seoTitle"),
      seoDescription: readString(formData, "seoDescription"),
      indexable: formData.get("indexable") === "on",
    });

    const problems = getContentProblems(content);
    if (problems.length > 0) throw new AdminActionError(freeCourseContentMessage(problems[0], t));

    const current = await fetchFreeCourse();
    if (current?.published && getPublishBlockers(content).length > 0) {
      throw new AdminActionError(t.freeCourseAdmin.errorPublishedIncomplete);
    }

    const updatedAt = new Date().toISOString();
    const expectedUpdatedAt = readString(formData, "updatedAt");

    if (!current) {
      // Only reachable if the migration's seed row was removed — recreate it as a draft.
      const { error } = await db
        .from("FreeCourse")
        .insert({ id: FREE_COURSE_ID, ...content, published: false, updatedAt });
      if (error?.code === "23505") throw new AdminActionError(t.freeCourseAdmin.errorConflict);
      if (error?.code === PG_CHECK_VIOLATION) throw new AdminActionError(t.admin.genericError);
      if (error) throw error;
    } else {
      if (!expectedUpdatedAt) throw new AdminActionError(t.freeCourseAdmin.errorConflict);
      // Until 20261012140000_free_course_allow_skipping is applied the row has no allowSkipping
      // column: keep other edits saving, but refuse to silently drop a request to disable skipping.
      const { allowSkipping, ...rest } = content;
      const skippingColumnReady = "allowSkipping" in current;
      if (!skippingColumnReady && !allowSkipping) {
        throw new AdminActionError(t.freeCourseAdmin.errorSkippingMigrationMissing);
      }
      // Optimistic concurrency: the update only applies if nobody saved since this form loaded.
      const { data, error } = await db
        .from("FreeCourse")
        .update({ ...(skippingColumnReady ? content : rest), updatedAt })
        .eq("id", FREE_COURSE_ID)
        .eq("updatedAt", expectedUpdatedAt)
        .select("id");
      if (error?.code === PG_CHECK_VIOLATION) throw new AdminActionError(t.freeCourseAdmin.errorPublishedIncomplete);
      if (error) throw error;
      if (data.length === 0) throw new AdminActionError(t.freeCourseAdmin.errorConflict);
    }

    await recordAuditLog({
      actorId: session.user.id,
      action: "FREE_COURSE_UPDATED",
      targetType: "FreeCourse",
      targetId: FREE_COURSE_ID,
    });
    revalidateFreeCourse();
    return { ok: true };
  });
}

export async function setFreeCoursePublished(
  published: boolean,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireAdmin();
    const { t } = await getT();

    const current = await fetchFreeCourse();
    if (!current) throw new AdminActionError(t.freeCourseAdmin.errorMissingRecord);
    if (published && getPublishBlockers(current).length > 0) {
      throw new AdminActionError(t.freeCourseAdmin.errorPublishIncomplete);
    }

    if (current.published !== published) {
      // updatedAt is deliberately left alone: it versions the *content* for the edit form's
      // conflict check, so publishing doesn't invalidate (or remount) an open, unsaved form.
      const { error } = await db
        .from("FreeCourse")
        .update({ published, publishedAt: published ? new Date().toISOString() : null })
        .eq("id", FREE_COURSE_ID);
      if (error?.code === PG_CHECK_VIOLATION) throw new AdminActionError(t.freeCourseAdmin.errorPublishIncomplete);
      if (error) throw error;

      await recordAuditLog({
        actorId: session.user.id,
        action: published ? "FREE_COURSE_PUBLISHED" : "FREE_COURSE_UNPUBLISHED",
        targetType: "FreeCourse",
        targetId: FREE_COURSE_ID,
      });
    }

    revalidateFreeCourse();
    return { ok: true };
  });
}
