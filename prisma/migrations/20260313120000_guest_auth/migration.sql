-- CreateEnum
CREATE TYPE "UserAuthType" AS ENUM ('GOOGLE', 'GUEST');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "authType" "UserAuthType" NOT NULL DEFAULT 'GOOGLE',
ADD COLUMN     "guestKeyAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "guestKeyHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_guestKeyHash_key" ON "User"("guestKeyHash");
