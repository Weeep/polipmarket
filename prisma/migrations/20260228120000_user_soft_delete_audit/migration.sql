-- Add soft-delete and session invalidation fields
ALTER TABLE "User"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- Add account deletion audit log
CREATE TABLE "UserDeletionAudit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserDeletionAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserDeletionAudit_userId_requestedAt_idx" ON "UserDeletionAudit"("userId", "requestedAt");

ALTER TABLE "UserDeletionAudit"
  ADD CONSTRAINT "UserDeletionAudit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
