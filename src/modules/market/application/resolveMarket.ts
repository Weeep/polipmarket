import { prisma } from "@/lib/prisma";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";
import { outcomeRepository } from "@/modules/market/infrastructure/outcomeRepository";
import { OrderPosition } from "@/modules/order/domain/Order";

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

    const orders = await tx.order.findMany({
      where: {
        marketId: input.marketId,
        status: { not: "CANCELLED" },
      },
      select: {
        userId: true,
        amount: true,
        price: true,
        outcomeId: true,
        position: true,
      },
    });

    const refunds = new Map<string, { locked: number; payout: number }>();
    for (const order of orders) {
      const locked = refunds.get(order.userId) ?? { locked: 0, payout: 0 };
      locked.locked += order.amount;

      if (
        order.outcomeId === input.outcomeId &&
        order.position === input.position
      ) {
        locked.payout += order.amount / order.price;
      }

      refunds.set(order.userId, locked);
    }

    for (const [userId, totals] of refunds) {
      if (totals.locked > 0 || totals.payout > 0) {
        await tx.wallet.update({
          where: { userId },
          data: {
            locked: { decrement: totals.locked },
            balance: { increment: totals.payout },
          },
        });
      }
    }

    await tx.order.updateMany({
      where: {
        marketId: input.marketId,
        status: { not: "CANCELLED" },
      },
      data: { status: "FILLED" },
    });

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
