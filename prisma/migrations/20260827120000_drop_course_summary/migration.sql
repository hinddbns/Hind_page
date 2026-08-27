-- Remove the course "short summary" (ملخص قصير) feature entirely. The field was a
-- second, shorter description shown only on course cards and the two admin course
-- views; `description` (الوصف الكامل) is now the single course description field.
-- No application code references "summary" after this migration.

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "summary";
