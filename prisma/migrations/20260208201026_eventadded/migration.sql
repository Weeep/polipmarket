-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "bettingCloseAt" DATETIME NOT NULL,
    "resolveAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Market" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BINARY',
    "bettingCloseAt" DATETIME NOT NULL,
    "resolveAt" DATETIME,
    "resolvedOutcomeId" TEXT,
    "resolvedPosition" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Market_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Market_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Market" ("bettingCloseAt", "createdAt", "createdBy", "description", "id", "question", "resolveAt", "resolvedOutcomeId", "resolvedPosition", "status", "type") SELECT "bettingCloseAt", "createdAt", "createdBy", "description", "id", "question", "resolveAt", "resolvedOutcomeId", "resolvedPosition", "status", "type" FROM "Market";
DROP TABLE "Market";
ALTER TABLE "new_Market" RENAME TO "Market";
CREATE INDEX "Market_status_idx" ON "Market"("status");
CREATE INDEX "Market_bettingCloseAt_idx" ON "Market"("bettingCloseAt");
CREATE INDEX "Market_type_idx" ON "Market"("type");
CREATE INDEX "Market_eventId_idx" ON "Market"("eventId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Event_createdBy_idx" ON "Event"("createdBy");
