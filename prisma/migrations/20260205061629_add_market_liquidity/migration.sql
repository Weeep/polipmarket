-- CreateTable
CREATE TABLE "MarketLiquidity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "yesPool" REAL NOT NULL DEFAULT 0,
    "noPool" REAL NOT NULL DEFAULT 0,
    "feeBps" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketLiquidity_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketLiquidity_marketId_key" ON "MarketLiquidity"("marketId");
