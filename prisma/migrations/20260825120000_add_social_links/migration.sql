-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'TIKTOK', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "SocialSurface" AS ENUM ('GLOBAL', 'PARENTS', 'ADOLESCENTS');

-- CreateTable
CREATE TABLE "SocialLink" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLinkAssignment" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "surface" "SocialSurface" NOT NULL,

    CONSTRAINT "SocialLinkAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialLinkAssignment_platform_surface_key" ON "SocialLinkAssignment"("platform", "surface");

-- AddForeignKey
ALTER TABLE "SocialLinkAssignment" ADD CONSTRAINT "SocialLinkAssignment_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "SocialLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

