/*
  Warnings:

  - Made the column `description` on table `Course` required. This step will fail if there are existing NULL values in that column.
  - Made the column `summary` on table `Course` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `Course` required. This step will fail if there are existing NULL values in that column.
  - Made the column `content` on table `Lesson` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `Lesson` required. This step will fail if there are existing NULL values in that column.
  - Made the column `text` on table `Question` required. This step will fail if there are existing NULL values in that column.
  - Made the column `label` on table `QuestionOption` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "demoVideoUrl" TEXT,
    "demoVideoPath" TEXT,
    "questionnaireEnabled" BOOLEAN NOT NULL DEFAULT false,
    "audience" TEXT NOT NULL DEFAULT 'PARENT_TEACHER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Course" ("createdAt", "demoVideoPath", "demoVideoUrl", "description", "id", "price", "published", "questionnaireEnabled", "slug", "summary", "title") SELECT "createdAt", "demoVideoPath", "demoVideoUrl", "description", "id", "price", "published", "questionnaireEnabled", "slug", "summary", "title" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE TABLE "new_Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "videoUrl" TEXT,
    "videoPath" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT NOT NULL,
    CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lesson" ("content", "courseId", "id", "order", "title", "videoPath", "videoUrl") SELECT "content", "courseId", "id", "order", "title", "videoPath", "videoUrl" FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "scaleMin" INTEGER,
    "scaleMax" INTEGER,
    "scaleMinLabel" TEXT,
    "scaleMaxLabel" TEXT,
    CONSTRAINT "Question_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("courseId", "id", "order", "scaleMax", "scaleMaxLabel", "scaleMin", "scaleMinLabel", "text", "type") SELECT "courseId", "id", "order", "scaleMax", "scaleMaxLabel", "scaleMin", "scaleMinLabel", "text", "type" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE TABLE "new_QuestionOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_QuestionOption" ("id", "label", "order", "questionId") SELECT "id", "label", "order", "questionId" FROM "QuestionOption";
DROP TABLE "QuestionOption";
ALTER TABLE "new_QuestionOption" RENAME TO "QuestionOption";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
