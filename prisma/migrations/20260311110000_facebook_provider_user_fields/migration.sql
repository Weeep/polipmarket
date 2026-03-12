-- Make email optional for provider-specific users and add Facebook profile identifier.
ALTER TABLE "User"
  ADD COLUMN "fbProfile" TEXT,
  ALTER COLUMN "email" DROP NOT NULL;

-- Replace strict email uniqueness with NULL-safe provider uniqueness.
DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_email_fbProfile_key";

CREATE UNIQUE INDEX "User_google_email_unique"
  ON "User"("email")
  WHERE "email" IS NOT NULL AND "fbProfile" IS NULL;

CREATE UNIQUE INDEX "User_facebook_profile_unique"
  ON "User"("fbProfile")
  WHERE "fbProfile" IS NOT NULL AND "email" IS NULL;
