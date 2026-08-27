import Link from "next/link";
import { db } from "@/lib/supabase/db";
import { formatPrice } from "@/lib/format";
import { getT } from "@/i18n/server";
import { createCourse, deleteCourse, toggleCoursePublished } from "../actions";
import CourseForm from "@/components/admin/CourseForm";
import ConfirmActionForm from "@/components/admin/ConfirmActionForm";
import AdminSearchForm from "@/components/admin/AdminSearchForm";

// Prisma's `contains` escapes LIKE wildcards so the search term is matched
// literally — reproduce that here, since a bare `.like()` would otherwise
// treat a `%` or `_` typed by the admin as a pattern instead of literal text.
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export default async function AdminCoursPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string; q?: string }>;
}) {
  const { t } = await getT();
  const { audience: audienceParam, q } = await searchParams;
  const activeAudience = audienceParam === "ADOLESCENT" || audienceParam === "PARENT_TEACHER" ? audienceParam : undefined;
  const searchQuery = q?.trim();

  let coursesQuery = db
    .from("Course")
    .select("*, lessons:Lesson(count), enrollments:Enrollment(count)")
    .order("createdAt", { ascending: false });
  if (activeAudience) coursesQuery = coursesQuery.eq("audience", activeAudience);
  if (searchQuery) coursesQuery = coursesQuery.like("title", `%${escapeLikePattern(searchQuery)}%`);
  const { data: coursesData, error: coursesError } = await coursesQuery;
  if (coursesError) throw coursesError;
  const courses = coursesData.map((c) => ({
    ...c,
    _count: { lessons: c.lessons[0]?.count ?? 0, enrollments: c.enrollments[0]?.count ?? 0 },
  }));

  const tabs: { value: "ADOLESCENT" | "PARENT_TEACHER" | undefined; label: string }[] = [
    { value: undefined, label: t.admin.filterAll },
    { value: "PARENT_TEACHER", label: t.admin.audienceParentTeacher },
    { value: "ADOLESCENT", label: t.admin.audienceAdolescent },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">{t.admin.coursesTitle}</h1>

      <div className="mt-6">
        <CourseForm action={createCourse} mode="create" />
      </div>

      <div className="mt-8 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/cours?audience=${tab.value}` : "/admin/cours"}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeAudience === tab.value
                ? "border-primary bg-primary text-cream"
                : "border-primary-light text-ink-soft hover:border-primary hover:text-primary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <AdminSearchForm
        placeholder={t.admin.searchCoursesPlaceholder}
        searchLabel={t.admin.search}
        defaultValue={searchQuery}
        hiddenParams={{ audience: activeAudience }}
      />

      <div className="mt-4 flex flex-col gap-4">
        {courses.length === 0 && searchQuery && (
          <p className="text-sm text-ink-soft">{t.admin.noSearchResults}</p>
        )}
        {courses.map((course) => (
          <div
            key={course.id}
            className="flex flex-col gap-3 rounded-2xl border border-primary-light/50 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-ink">{course.title}</p>
              <p className="mt-1 line-clamp-1 text-sm text-ink-soft">{course.description}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {formatPrice(course.price)} · {course._count.lessons} {t.courses.lessonsCount} ·{" "}
                {course._count.enrollments} {t.admin.requestsCount}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary-dark">
                {course.audience === "ADOLESCENT" ? t.admin.audienceAdolescent : t.admin.audienceParentTeacher}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  course.published
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-ink/15 bg-ink/5 text-ink-soft"
                }`}
              >
                {course.published ? t.admin.published : t.admin.draft}
              </span>
              <Link
                href={`/admin/cours/${course.id}`}
                className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:border-primary hover:text-primary"
              >
                {t.admin.manageLessons}
              </Link>
              <ConfirmActionForm
                action={toggleCoursePublished.bind(null, course.id, !course.published)}
                confirmMessage={course.published ? t.admin.confirmUnpublish : undefined}
                successMessage={course.published ? t.admin.courseUnpublished : t.admin.coursePublished}
                label={course.published ? t.admin.unpublish : t.admin.publish}
                pendingLabel={t.admin.saving}
                className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:border-primary hover:text-primary"
              />
              <ConfirmActionForm
                action={deleteCourse.bind(null, course.id)}
                confirmMessage={t.admin.confirmDeleteCourse}
                successMessage={t.admin.courseDeleted}
                label={t.admin.delete}
                pendingLabel={t.admin.deleting}
                className="rounded-full border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
