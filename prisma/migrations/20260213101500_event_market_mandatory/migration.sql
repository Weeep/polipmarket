PRAGMA foreign_keys=OFF;

INSERT INTO "Event" (
  "id",
  "question",
  "description",
  "bettingCloseAt",
  "resolveAt",
  "createdBy",
  "createdAt",
  "updatedAt"
)
SELECT
  'migrated_event_' || "id",
  "question",
  "description",
  "bettingCloseAt",
  "resolveAt",
  "createdBy",
  "createdAt",
  CURRENT_TIMESTAMP
FROM "Market"
WHERE "eventId" IS NULL;

UPDATE "Market"
SET "eventId" = 'migrated_event_' || "id"
WHERE "eventId" IS NULL;

CREATE TABLE "new_Market" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
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
  CONSTRAINT "Market_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Market_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Market" (
  "id",
  "eventId",
  "question",
  "description",
  "status",
  "type",
  "bettingCloseAt",
  "resolveAt",
  "resolvedOutcomeId",
  "resolvedPosition",
  "createdBy",
  "createdAt"
)
SELECT
  "id",
  "eventId",
  "question",
  "description",
  "status",
  "type",
  "bettingCloseAt",
  "resolveAt",
  "resolvedOutcomeId",
  "resolvedPosition",
  "createdBy",
  "createdAt"
FROM "Market";

DROP TABLE "Market";
ALTER TABLE "new_Market" RENAME TO "Market";

CREATE INDEX "Market_status_idx" ON "Market"("status");
CREATE INDEX "Market_bettingCloseAt_idx" ON "Market"("bettingCloseAt");
CREATE INDEX "Market_type_idx" ON "Market"("type");
CREATE INDEX "Market_eventId_idx" ON "Market"("eventId");

PRAGMA foreign_keys=ON;
