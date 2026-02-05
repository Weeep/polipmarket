-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Outcome_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketAmmConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "curve" TEXT NOT NULL DEFAULT 'CPMM',
    "feeBps" INTEGER NOT NULL DEFAULT 100,
    "lmsrB" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketAmmConfig_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutcomeLiquidity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outcomeId" TEXT NOT NULL,
    "yesPool" REAL NOT NULL DEFAULT 0,
    "noPool" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OutcomeLiquidity_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "Outcome" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Market" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BINARY',
    "closeAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Market_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Market" ("closeAt", "createdAt", "createdBy", "description", "id", "question", "status") SELECT "closeAt", "createdAt", "createdBy", "description", "id", "question", "status" FROM "Market";
DROP TABLE "Market";
ALTER TABLE "new_Market" RENAME TO "Market";
CREATE INDEX "Market_status_idx" ON "Market"("status");
CREATE INDEX "Market_closeAt_idx" ON "Market"("closeAt");
CREATE INDEX "Market_type_idx" ON "Market"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Outcome_marketId_position_idx" ON "Outcome"("marketId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Outcome_marketId_slug_key" ON "Outcome"("marketId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarketAmmConfig_marketId_key" ON "MarketAmmConfig"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "OutcomeLiquidity_outcomeId_key" ON "OutcomeLiquidity"("outcomeId");
