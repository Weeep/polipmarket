-- CreateEnum
CREATE TYPE "RateLimitAuditEventType" AS ENUM ('DECISION', 'BACKEND_ERROR');

-- CreateTable
CREATE TABLE "RateLimitAuditEvent" (
    "id" TEXT NOT NULL,
    "eventType" "RateLimitAuditEventType" NOT NULL,
    "endpointType" TEXT,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "region" TEXT,
    "ipHash" TEXT,
    "userHash" TEXT,
    "allowed" BOOLEAN,
    "quotaLimit" INTEGER,
    "remaining" INTEGER,
    "retryAfterSeconds" INTEGER,
    "resetAtUnixSeconds" INTEGER,
    "decisionLatencyMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitAuditEvent_createdAt_idx" ON "RateLimitAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimitAuditEvent_eventType_createdAt_idx" ON "RateLimitAuditEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitAuditEvent_endpointType_createdAt_idx" ON "RateLimitAuditEvent"("endpointType", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitAuditEvent_allowed_createdAt_idx" ON "RateLimitAuditEvent"("allowed", "createdAt");
