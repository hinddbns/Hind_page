import Link from "next/link";
import { getT } from "@/i18n/server";
import { interpolate } from "@/i18n/config";
import { listFreeCourses } from "@/lib/freeCourse";
import { freeCourseAdminPath, freeCoursePath, getAccessLinkStatus } from "@/lib/freeCourseAccess";
import { createFreeCourse } from "../actions";
import { absoluteUrl } from "./absoluteUrl";
import FreeCourseCreateForm from "@/components/admin/FreeCourseCreateForm";
import CopyButton from "@/components/CopyButton";

export default async function AdminFreeCoursesPage() {
  const { t } = await getT();
  const f = t.freeCourseAdmin;
  const courses = await listFreeCourses();
  const now = new Date();
  const rows = await Promise.all(
    courses.map(async (course) => ({
      course,
      linkStatus: getAccessLinkStatus(course, course.accessCode ?? "", now),
      url: course.accessCode ? await absoluteUrl(freeCoursePath(course.accessCode)) : null,
    }))
  );

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">{f.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">{f.subtitle}</p>

      <div className="mt-6">
        <FreeCourseCreateForm action={createFreeCourse} defaultOpen={courses.length === 0} />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {rows.length === 0 && <p className="text-sm text-ink-soft">{f.listEmpty}</p>}
        {rows.map(({ course, linkStatus, url }) => (
          <div
            key={course.id}
            className="flex flex-col gap-3 rounded-2xl border border-primary-light/50 bg-white p-6 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-ink">{course.title || f.editLink}</p>
              {course.eyebrow && <p className="mt-1 text-sm text-ink-soft">{course.eyebrow}</p>}
              {url && (
                <p className="mt-1 flex flex-wrap items-center gap-1 text-sm">
                  <code dir="ltr" className="break-all rounded-md bg-cream-dark/60 px-2 py-0.5 text-xs text-ink-soft">
                    {url}
                  </code>
                  <CopyButton value={url} fieldLabel={f.accessLinkLabel} />
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  course.published ? "border-success/30 bg-success/10 text-success" : "border-ink/15 bg-ink/5 text-ink-soft"
                }`}
              >
                {course.published ? t.admin.published : t.admin.draft}
              </span>
              {linkStatus === "expired" ? (
                <span className="rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
                  {f.accessStatusExpired}
                </span>
              ) : (
                course.accessExpiresOn && (
                  <span className="rounded-full border border-ink/15 bg-ink/5 px-3 py-1 text-xs font-medium text-ink-soft">
                    {interpolate(f.expiresOn, { date: course.accessExpiresOn })}
                  </span>
                )
              )}
              <Link
                href={freeCourseAdminPath(course.id)}
                className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:border-primary hover:text-primary"
              >
                {f.editLink}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
