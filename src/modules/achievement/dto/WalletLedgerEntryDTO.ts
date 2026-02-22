export type WalletLedgerEntryDTO = {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: Date;
};
