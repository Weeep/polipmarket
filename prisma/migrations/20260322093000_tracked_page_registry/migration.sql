-- CreateEnum
CREATE TYPE "TrackedPagePlatform" AS ENUM ('FACEBOOK');

-- CreateEnum
CREATE TYPE "TrackedPageStatus" AS ENUM ('ACTIVE', 'PAUSED', 'BROKEN', 'ARCHIVED');

-- CreateTable
CREATE TABLE "TrackedPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "platform" "TrackedPagePlatform" NOT NULL DEFAULT 'FACEBOOK',
    "sourceUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "status" "TrackedPageStatus" NOT NULL DEFAULT 'ACTIVE',
    "scrapeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "loginRequired" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT,
    "party" TEXT,
    "role" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scrapeNotes" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackedPage_slug_key" ON "TrackedPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedPage_sourceUrl_key" ON "TrackedPage"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedPage_canonicalUrl_key" ON "TrackedPage"("canonicalUrl");

-- CreateIndex
CREATE INDEX "TrackedPage_status_scrapeEnabled_idx" ON "TrackedPage"("status", "scrapeEnabled");

-- CreateIndex
CREATE INDEX "TrackedPage_country_idx" ON "TrackedPage"("country");

-- CreateIndex
CREATE INDEX "TrackedPage_party_idx" ON "TrackedPage"("party");
