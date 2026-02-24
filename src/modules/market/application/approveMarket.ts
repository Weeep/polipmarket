import { prisma } from "@/lib/prisma";
import { EVENT_APPROVAL_REWARD } from "@/config/economy";
import { walletLedgerRepository } from "@/modules/achievement/infrastructure/walletLedgerRepository";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";

export async function approveMarket(marketId: string) {
  return prisma.$transaction(async (tx) => {
    const market = await marketRepository.findById(marketId, tx);

    if (!market) {
      throw new Error("Market not found");
    }

    if (market.status !== "PENDING_APPROVAL") {
      throw new Error("Only PENDING_APPROVAL markets can be approved");
    }

    const alreadyApprovedMarketCount = await tx.market.count({
      where: {
        eventId: market.eventId,
        status: "OPEN",
      },
    });

    if (alreadyApprovedMarketCount === 0) {
      await tx.wallet.update({
        where: { userId: market.createdBy },
        data: {
          balance: {
            increment: EVENT_APPROVAL_REWARD,
          },
        },
      });

      await walletLedgerRepository.createEntry(
        {
          userId: market.createdBy,
          amount: EVENT_APPROVAL_REWARD,
          reason: "EVENT_APPROVAL_REWARD",
          referenceType: "EVENT",
          referenceId: market.eventId,
        },
        tx,
      );
    }

    return marketRepository.updateStatus(marketId, "OPEN", tx);
  });
}
