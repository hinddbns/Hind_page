import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { getT } from "@/i18n/server";
import UploadReceiptForm from "@/components/UploadReceiptForm";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { t } = await getT();

  const course = await prisma.course.findUnique({
    where: { slug },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  if (!course || !course.published) notFound();

  const backHref = course.audience === "ADOLESCENT" ? "/ados" : "/parents-enseignants";

  const session = await auth();
  const enrollment = session?.user
    ? await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link href={backHref} className="text-sm font-medium text-primary hover:underline">
        {t.courses.retourAuxCours}
      </Link>

      <h1 className="mt-4 font-serif text-4xl text-ink">{course.title}</h1>

      {(course.demoVideoPath || course.demoVideoUrl) && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-primary-light/50 bg-black">
          {course.demoVideoPath ? (
            <video controls className="aspect-video w-full" src={course.demoVideoPath} />
          ) : (
            <a
              href={course.demoVideoUrl!}
              target="_blank"
              rel="noreferrer"
              className="flex aspect-video w-full items-center justify-center gap-3 bg-ink text-cream hover:bg-ink/90"
            >
              <PlayCircle className="h-10 w-10" />
              <span className="font-medium">{t.courses.watchDemo}</span>
            </a>
          )}
        </div>
      )}

      <p className="mt-6 whitespace-pre-line text-ink-soft">{course.description}</p>

      <div className="mt-8 rounded-2xl border border-primary-light/50 bg-white p-6">
        <h2 className="font-serif text-lg text-ink">{t.courses.contenuDuParcours}</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
          {course.lessons.map((lesson) => (
            <li key={lesson.id} className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {lesson.order}
              </span>
              {lesson.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex items-center justify-between rounded-2xl bg-cream-dark/60 p-6">
        <span className="font-serif text-2xl text-primary-dark">{formatPrice(course.price)}</span>
      </div>

      <div className="mt-8">
        {!session?.user ? (
          <div className="rounded-2xl border border-primary-light/50 bg-white p-6 text-center">
            <p className="text-ink-soft">{t.receipt.loginPrompt}</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="/connexion"
                className="rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-cream"
              >
                {t.nav.connexion}
              </Link>
              <Link
                href="/inscription"
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-cream hover:bg-primary-dark"
              >
                {t.nav.creerCompte}
              </Link>
            </div>
          </div>
        ) : enrollment?.status === "APPROVED" ? (
          <div className="rounded-2xl bg-success/10 p-6 text-center text-success">
            <p>{t.receipt.approvedNotice}</p>
            <Link
              href={`/tableau-de-bord/cours/${course.slug}`}
              className="mt-3 inline-block rounded-full bg-success px-5 py-2 text-sm font-medium text-cream hover:opacity-90"
            >
              {t.receipt.accessContent}
            </Link>
          </div>
        ) : enrollment?.status === "PENDING" ? (
          <UploadReceiptForm
            courseId={course.id}
            existing={{ id: enrollment.id, note: enrollment.receiptNote, status: "PENDING" }}
          />
        ) : enrollment?.status === "REJECTED" ? (
          <UploadReceiptForm
            courseId={course.id}
            existing={{ id: enrollment.id, note: enrollment.receiptNote, status: "REJECTED" }}
          />
        ) : (
          <UploadReceiptForm courseId={course.id} />
        )}
      </div>
    </div>
  );
}
