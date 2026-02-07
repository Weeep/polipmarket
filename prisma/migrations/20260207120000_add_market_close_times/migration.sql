-- Add betting close time and resolution time, rename existing closeAt to bettingCloseAt.
ALTER TABLE "Market" RENAME COLUMN "closeAt" TO "bettingCloseAt";
ALTER TABLE "Market" ADD COLUMN "resolveAt" DATETIME;

UPDATE "Market"
SET "resolveAt" = "bettingCloseAt"
WHERE "resolveAt" IS NULL;

DROP INDEX IF EXISTS "Market_closeAt_idx";
CREATE INDEX "Market_bettingCloseAt_idx" ON "Market"("bettingCloseAt");
