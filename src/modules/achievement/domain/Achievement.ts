export type AchievementDefinitionUpsertInput = {
  number: number;
  code: string;
  title: string;
  description?: string | null;
  reward: number;
  category: string;
  targetValue?: number | null;
  isActive?: boolean;
};

export type CreateWalletLedgerEntryInput = {
  userId: string;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
};
