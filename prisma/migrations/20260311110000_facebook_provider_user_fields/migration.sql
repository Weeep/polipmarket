-- Make email optional for provider-specific users and add Facebook profile identifier.
ALTER TABLE "User"
  ADD COLUMN "fbProfile" TEXT,
  ALTER COLUMN "email" DROP NOT NULL;

-- Replace strict email uniqueness with pair-level uniqueness.
DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX "User_email_fbProfile_key" ON "User"("email", "fbProfile");
