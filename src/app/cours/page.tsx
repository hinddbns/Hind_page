import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import CourseCard from "@/components/CourseCard";

export const metadata = { title: "دوراتنا" };

export default async function CoursListPage() {
  const { t } = await getT();

  const courses = await prisma.course.findMany({
    where: { published: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-serif text-4xl text-ink">{t.courses.listTitle}</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">{t.courses.listSubtitle}</p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            ctaLabel={t.courses.enSavoirPlus}
            demoLabel={t.courses.watchDemo}
          />
        ))}
      </div>
    </div>
  );
}
