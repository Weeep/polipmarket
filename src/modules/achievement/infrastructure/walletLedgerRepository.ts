import { prisma } from "@/lib/prisma";
import type { CreateWalletLedgerEntryInput } from "@/modules/achievement/domain/Achievement";
import { Prisma } from "@prisma/client";

export type WalletLedgerRepository = {
  createEntry(
    entry: CreateWalletLedgerEntryInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.WalletLedgerGetPayload<object>>;
};

export const walletLedgerRepository: WalletLedgerRepository = {
  async createEntry(entry, tx) {
    const client = tx ?? prisma;

    return client.walletLedger.create({
      data: {
        userId: entry.userId,
        amount: entry.amount,
        reason: entry.reason,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
      },
    });
  },
};
