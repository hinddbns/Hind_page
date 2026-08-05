-- Collapse bilingual FR/AR columns into single Arabic-only columns, preserving data.

-- Course
ALTER TABLE "Course" ADD COLUMN "title" TEXT;
ALTER TABLE "Course" ADD COLUMN "summary" TEXT;
ALTER TABLE "Course" ADD COLUMN "description" TEXT;
UPDATE "Course" SET "title" = "titleAr", "summary" = "summaryAr", "description" = "descriptionAr";
ALTER TABLE "Course" DROP COLUMN "titleFr";
ALTER TABLE "Course" DROP COLUMN "titleAr";
ALTER TABLE "Course" DROP COLUMN "summaryFr";
ALTER TABLE "Course" DROP COLUMN "summaryAr";
ALTER TABLE "Course" DROP COLUMN "descriptionFr";
ALTER TABLE "Course" DROP COLUMN "descriptionAr";

-- Lesson
ALTER TABLE "Lesson" ADD COLUMN "title" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "content" TEXT;
UPDATE "Lesson" SET "title" = "titleAr", "content" = "contentAr";
ALTER TABLE "Lesson" DROP COLUMN "titleFr";
ALTER TABLE "Lesson" DROP COLUMN "titleAr";
ALTER TABLE "Lesson" DROP COLUMN "contentFr";
ALTER TABLE "Lesson" DROP COLUMN "contentAr";

-- Question
ALTER TABLE "Question" ADD COLUMN "text" TEXT;
ALTER TABLE "Question" ADD COLUMN "scaleMinLabel" TEXT;
ALTER TABLE "Question" ADD COLUMN "scaleMaxLabel" TEXT;
UPDATE "Question" SET "text" = "textAr", "scaleMinLabel" = "scaleMinLabelAr", "scaleMaxLabel" = "scaleMaxLabelAr";
ALTER TABLE "Question" DROP COLUMN "textFr";
ALTER TABLE "Question" DROP COLUMN "textAr";
ALTER TABLE "Question" DROP COLUMN "scaleMinLabelFr";
ALTER TABLE "Question" DROP COLUMN "scaleMinLabelAr";
ALTER TABLE "Question" DROP COLUMN "scaleMaxLabelFr";
ALTER TABLE "Question" DROP COLUMN "scaleMaxLabelAr";

-- QuestionOption
ALTER TABLE "QuestionOption" ADD COLUMN "label" TEXT;
UPDATE "QuestionOption" SET "label" = "labelAr";
ALTER TABLE "QuestionOption" DROP COLUMN "labelFr";
ALTER TABLE "QuestionOption" DROP COLUMN "labelAr";

-- Settings
ALTER TABLE "Settings" ADD COLUMN "availability" TEXT NOT NULL DEFAULT 'من الاثنين إلى الجمعة، من 9 صباحًا إلى 5 مساءً.';
UPDATE "Settings" SET "availability" = "availabilityAr";
ALTER TABLE "Settings" DROP COLUMN "availabilityFr";
ALTER TABLE "Settings" DROP COLUMN "availabilityAr";
