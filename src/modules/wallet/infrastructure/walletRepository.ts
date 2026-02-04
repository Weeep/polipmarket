import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Wallet } from "../domain/Wallet";

export type WalletRepository = {
  create(userId: string): Promise<Wallet>;
  findByUserId(userId: string): Promise<Wallet | null>;
  lockFunds(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Wallet>;
  unlockFunds(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Wallet>;
};

export const walletRepository: WalletRepository = {
  async create(userId) {
    return prisma.wallet.create({
      data: {
        userId,
      },
    });
  },

  async findByUserId(userId) {
    return prisma.wallet.findUnique({
      where: { userId },
    });
  },

  async lockFunds(userId, amount, tx) {
    const client = tx ?? prisma;

    return client.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
        locked: { increment: amount },
      },
    });
  },

  async unlockFunds(userId, amount, tx) {
    const client = tx ?? prisma;
    return client.wallet.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        locked: { decrement: amount },
      },
    });
  },
};
