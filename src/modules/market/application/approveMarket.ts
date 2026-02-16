import { prisma } from "@/lib/prisma";
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

    return marketRepository.updateStatus(marketId, "OPEN", tx);
  });
}
