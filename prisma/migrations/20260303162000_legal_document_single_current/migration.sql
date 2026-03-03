-- Enforce at most one current legal document version per document type
CREATE UNIQUE INDEX "LegalDocumentVersion_single_current_per_type_key"
ON "LegalDocumentVersion"("documentType")
WHERE "isCurrent" = true;
