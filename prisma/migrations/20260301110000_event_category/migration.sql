-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('POLITICS', 'SPORT', 'WORLD_OTHER');

-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "category" "EventCategory" NOT NULL DEFAULT 'POLITICS';

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "Event"("category");
