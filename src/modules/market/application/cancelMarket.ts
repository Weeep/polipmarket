import { prisma } from "@/lib/prisma";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";
import { walletRepository } from "@/modules/wallet/infrastructure/walletRepository";

export async function cancelMarket(marketId: string) {
  return prisma.$transaction(async (tx) => {
    const market = await marketRepository.findById(marketId, tx);

    if (!market) {
      throw new Error("Market not found");
    }

    if (market.status !== "OPEN" && market.status !== "CLOSED") {
      throw new Error("Only OPEN or CLOSED markets can be cancelled");
    }

    const orders = await tx.order.findMany({
      where: {
        marketId,
        status: { in: ["OPEN", "FILLED"] },
      },
      select: {
        userId: true,
        amount: true,
      },
    });

    const refunds = new Map<string, number>();
    for (const order of orders) {
      refunds.set(order.userId, (refunds.get(order.userId) ?? 0) + order.amount);
    }

    for (const [userId, amount] of refunds) {
      if (amount > 0) {
        await walletRepository.unlockFunds(userId, amount, tx);
      }
    }

    await tx.order.updateMany({
      where: {
        marketId,
        status: { in: ["OPEN", "FILLED"] },
      },
      data: { status: "CANCELLED" },
    });

    return marketRepository.updateStatus(marketId, "CANCELLED", tx);
  });
}
