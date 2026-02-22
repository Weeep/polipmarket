import { prisma } from "@/lib/prisma";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";
import { outcomeRepository } from "@/modules/market/infrastructure/outcomeRepository";
import { OrderPosition } from "@/modules/order/domain/Order";
import { evaluateAchievementsForUser } from "@/modules/achievement/application/evaluateAchievementsForUser";

type ResolveMarketInput = {
  marketId: string;
  outcomeId: string;
  position: OrderPosition;
};

export async function resolveMarket(input: ResolveMarketInput) {
  return prisma.$transaction(async (tx) => {
    const market = await marketRepository.findById(input.marketId, tx);

    if (!market) {
      throw new Error("Market not found");
    }

    if (market.status !== "CLOSED") {
      throw new Error("Only CLOSED markets can be resolved");
    }

    await outcomeRepository.ensureBelongsToMarket(
      input.marketId,
      input.outcomeId,
      tx,
    );

    const positions = await tx.position.findMany({
      where: {
        marketId: input.marketId,
      },
      select: {
        id: true,
        userId: true,
        outcomeId: true,
        position: true,
        shares: true,
        costBasis: true,
      },
    });

    const settlements = new Map<string, { lockedRelease: number; payout: number }>();

    for (const entry of positions) {
      const settlement = settlements.get(entry.userId) ?? {
        lockedRelease: 0,
        payout: 0,
      };

      settlement.lockedRelease += entry.shares * entry.costBasis;

      if (entry.outcomeId === input.outcomeId && entry.position === input.position) {
        settlement.payout += entry.shares;
      }

      settlements.set(entry.userId, settlement);
    }

    for (const [userId, totals] of settlements) {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        throw new Error(`Wallet not found for user: ${userId}`);
      }

      const lockedRelease = Math.max(0, Math.min(wallet.locked, totals.lockedRelease));
      const payout = Math.max(0, totals.payout);

      if (lockedRelease > 0 || payout > 0) {
        await tx.wallet.update({
          where: { userId },
          data: {
            locked: { decrement: lockedRelease },
            balance: { increment: payout },
          },
        });
      }
    }

    await tx.position.deleteMany({
      where: {
        marketId: input.marketId,
      },
    });

    await tx.positionLot.updateMany({
      where: {
        marketId: input.marketId,
        remainingShares: { gt: 0 },
      },
      data: {
        remainingShares: 0,
      },
    });

    await tx.order.updateMany({
      where: {
        marketId: input.marketId,
        status: { not: "CANCELLED" },
      },
      data: { status: "FILLED" },
    });

    for (const userId of settlements.keys()) {
      await evaluateAchievementsForUser({
        userId,
        tx,
      });
    }

    const updated = await tx.market.update({
      where: { id: input.marketId },
      data: {
        status: "RESOLVED",
        resolvedOutcomeId: input.outcomeId,
        resolvedPosition: input.position,
      },
      include: {
        outcomes: {
          orderBy: { position: "asc" },
        },
        ammConfig: true,
      },
    });

    const resolvedMarket = await marketRepository.findById(updated.id, tx);
    if (!resolvedMarket) {
      throw new Error("Market not found after resolution");
    }

    return resolvedMarket;
  });
}
