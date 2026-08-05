import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMoi123!";

  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  await prisma.settings.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main" },
  });

  const courses = [
    {
      slug: "communiquer-avec-son-ado",
      title: "التواصل مع ابنك المراهق",
      summary: "أدوات عملية لاستعادة الحوار مع ابنك المراهق ونزع فتيل الخلافات اليومية.",
      description:
        "هذه الدورة المصورة موجهة للأمهات اللواتي يشعرن بانقطاع الحوار مع أبنائهن المراهقين. من خلال دروس قصيرة وتمارين عملية، ستتعلمين فهم احتياجات ابنك المراهق، ووضع حدود واضحة دون قطع الصلة، وتحويل التوترات إلى فرص للتقارب.",
      price: 1200,
      demoVideoPath: "/uploads/demos/demo-communiquer-avec-son-ado.mp4",
      lessons: [
        {
          title: "فهم ما يحدث خلال مرحلة المراهقة",
          content: "مقدمة حول التحولات النفسية والعلائقية التي تطرأ خلال مرحلة المراهقة.",
          videoPath: "lesson-communiquer-1.mp4",
          order: 1,
        },
        {
          title: "الخروج من دوامة الخلافات المتكررة",
          content: "التعرف على أنماط الخلافات المتكررة وطرق نزع فتيلها.",
          videoPath: "lesson-communiquer-2.mp4",
          order: 2,
        },
        {
          title: "وضع حدود دون قطع الصلة",
          content: "تحديد حدود واضحة مع الحفاظ على علاقة الثقة.",
          order: 3,
        },
      ],
    },
    {
      slug: "gerer-la-classe-difficile",
      title: "التحكم في قسم صعب",
      summary: "مرافقة للأساتذة الذين يواجهون الشغب والانقطاع الدراسي والتوترات داخل القسم.",
      description:
        "دورة موجهة لأساتذة التعليم الثانوي، تقدم استراتيجيات مجربة لاستعادة جو هادئ داخل القسم، وإعادة تحفيز التلاميذ المتعثرين، والوقاية من الإرهاق المهني.",
      price: 1500,
      demoVideoPath: "/uploads/demos/demo-gerer-la-classe-difficile.mp4",
      lessons: [
        {
          title: "تشخيص أجواء القسم",
          content: "التعرف على مؤشرات تدهور ديناميكية المجموعة.",
          order: 1,
        },
        {
          title: "تقنيات التأطير اللطيف",
          content: "أساليب للتدخل دون تصعيد أو فقدان للسلطة.",
          order: 2,
        },
      ],
    },
    {
      slug: "coaching-de-vie-general",
      title: "التطوير الذاتي والتوجيه العام",
      summary: "دورة لتوضيح أهدافك الشخصية والمهنية والتقدم بثقة.",
      description:
        "سواء كنت تمر بتحول مهني أو مرحلة مساءلة ذاتية أو تحتاج فقط إلى مزيد من الوضوح، تساعدك هذه الدورة المصورة على تحديد أولوياتك وبناء خطة عمل واقعية، بالوتيرة التي تناسبك.",
      price: 1800,
      demoVideoPath: "/uploads/demos/demo-coaching-de-vie-general.mp4",
      lessons: [
        {
          title: "تقييم وضعك الحالي",
          content: "تمرين موجه لتوضيح موقعك الحالي.",
          order: 1,
        },
        {
          title: "تحديد أهداف واقعية",
          content: "منهجية لوضع أهداف قابلة للتحقيق ومحفزة.",
          order: 2,
        },
      ],
    },
  ];

  for (const c of courses) {
    const { lessons, ...courseData } = c;
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: courseData,
      create: courseData,
    });
    for (const lesson of lessons) {
      const existing = await prisma.lesson.findFirst({
        where: { courseId: course.id, order: lesson.order },
      });
      if (!existing) {
        await prisma.lesson.create({
          data: { ...lesson, courseId: course.id },
        });
      } else {
        await prisma.lesson.update({
          where: { id: existing.id },
          data: lesson,
        });
      }
    }
  }

  console.log("تم التهيئة. المسؤول:", adminEmail, "/ كلمة المرور:", adminPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
