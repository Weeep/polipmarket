-- CreateTable
CREATE TABLE "RateLimitDenyAudit" (
    "id" TEXT NOT NULL,
    "endpointType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userHash" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "retryAfterSeconds" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitDenyAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitDenyAudit_createdAt_idx" ON "RateLimitDenyAudit"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimitDenyAudit_endpointType_createdAt_idx" ON "RateLimitDenyAudit"("endpointType", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitDenyAudit_path_createdAt_idx" ON "RateLimitDenyAudit"("path", "createdAt");
