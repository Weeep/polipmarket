-- AlterTable
ALTER TABLE "LegalDocumentVersion"
ADD COLUMN "sourceFileName" TEXT NOT NULL DEFAULT 'unknown';

-- Remove temporary default for future inserts
ALTER TABLE "LegalDocumentVersion"
ALTER COLUMN "sourceFileName" DROP DEFAULT;
