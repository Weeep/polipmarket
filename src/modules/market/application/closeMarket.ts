import { prisma } from "@/lib/prisma";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";

export async function closeMarket(marketId: string) {
  return prisma.$transaction(async (tx) => {
    const market = await marketRepository.findById(marketId, tx);

    if (!market) {
      throw new Error("Market not found");
    }

    if (market.status !== "OPEN") {
      throw new Error("Only OPEN markets can be closed");
    }

    return marketRepository.updateStatus(marketId, "CLOSED", tx);
  });
}
