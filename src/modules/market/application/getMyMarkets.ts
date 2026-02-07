// modules/market/application/getMyMarkets.ts
import { prisma } from "@/lib/prisma";
import { MyMarketBetDTO } from "../dto/myMarketBetDTO";

export async function getMyMarkets(
  userId: string,
  limit = 5,
): Promise<MyMarketBetDTO[]> {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      status: { not: "CANCELLED" },
    },
    include: {
      market: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });

  const map = new Map<string, MyMarketBetDTO>();

  for (const order of orders) {
    if (!map.has(order.marketId)) {
      map.set(order.marketId, {
        marketId: order.market.id,
        question: order.market.question,
        closesAt: order.market.bettingCloseAt.toISOString(),
        resolvesAt: order.market.resolveAt?.toISOString() ?? null,
        status: order.market.status,
        latestBetAt: order.createdAt.toISOString(),
        bets: [],
      });
    }

    const market = map.get(order.marketId)!;

    market.bets.push({
      orderId: order.id,
      outcome: order.outcomeId as "YES" | "NO",
      amount: order.amount,
      price: order.price,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    });

    if (order.createdAt > new Date(market.latestBetAt)) {
      market.latestBetAt = order.createdAt.toISOString();
    }
  }

  return Array.from(map.values())
    .sort(
      (a, b) =>
        Math.abs(new Date(a.latestBetAt).getTime() - Date.now()) -
        Math.abs(new Date(b.latestBetAt).getTime() - Date.now()),
    )
    .slice(0, limit);
}
