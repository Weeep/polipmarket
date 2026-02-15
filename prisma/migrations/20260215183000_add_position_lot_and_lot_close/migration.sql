-- CreateTable
CREATE TABLE "PositionLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "buyOrderId" TEXT NOT NULL,
    "openedShares" REAL NOT NULL,
    "remainingShares" REAL NOT NULL,
    "entryPrice" REAL NOT NULL,
    "entryGrossAmount" REAL NOT NULL,
    "entryFee" REAL NOT NULL,
    "entryNetAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PositionLot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PositionLot_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PositionLot_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "Outcome" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PositionLot_buyOrderId_fkey" FOREIGN KEY ("buyOrderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LotClose" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellOrderId" TEXT NOT NULL,
    "buyLotId" TEXT NOT NULL,
    "closedShares" REAL NOT NULL,
    "grossAmount" REAL NOT NULL,
    "feeAmount" REAL NOT NULL,
    "netAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LotClose_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LotClose_buyLotId_fkey" FOREIGN KEY ("buyLotId") REFERENCES "PositionLot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PositionLot_buyOrderId_key" ON "PositionLot"("buyOrderId");

-- CreateIndex
CREATE INDEX "PositionLot_userId_marketId_outcomeId_position_idx" ON "PositionLot"("userId", "marketId", "outcomeId", "position");

-- CreateIndex
CREATE INDEX "PositionLot_marketId_idx" ON "PositionLot"("marketId");

-- CreateIndex
CREATE INDEX "LotClose_sellOrderId_idx" ON "LotClose"("sellOrderId");

-- CreateIndex
CREATE INDEX "LotClose_buyLotId_idx" ON "LotClose"("buyLotId");
