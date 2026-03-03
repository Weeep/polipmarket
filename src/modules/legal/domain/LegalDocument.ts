export type LegalDocumentType = "TERMS_OF_SERVICE" | "PRIVACY_NOTICE";

export interface LegalDocumentVersion {
  id: string;
  documentType: LegalDocumentType;
  version: string;
  sourceFileName: string;
  contentHash: string;
  effectiveFrom: Date;
  publishedAt: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}
