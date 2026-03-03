export type LegalAcceptanceSource =
  | "SIGNUP"
  | "LEGAL_GATE"
  | "PROFILE_REACCEPT"
  | "UNKNOWN";

export interface UserLegalAcceptance {
  id: string;
  userId: string;
  documentVersionId: string;
  acceptedAt: Date;
  ipHash?: string | null;
  userAgent?: string | null;
  source?: LegalAcceptanceSource | null;
  createdAt: Date;
}
