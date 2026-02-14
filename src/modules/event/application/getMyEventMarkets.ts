import { prisma } from "@/lib/prisma";
import { MyEventMarketBetDTO } from "../dto/myEventMarketBetDTO";

function makeKey(input: {
  marketId: string;
  outcomeId: string;
  position: "YES" | "NO";
}) {
  return `${input.marketId}:${input.outcomeId}:${input.position}`;
}

export async function getMyEventMarkets(
  userId: string,
  limit = 5,
): Promise<MyEventMarketBetDTO[]> {
  const [orders, sellOrders, positions] = await Promise.all([
    prisma.order.findMany({
      where: { userId, side: "BUY" },
      include: {
        market: {
          include: {
            event: true,
            outcomes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    }),
    prisma.order.findMany({
      where: { userId, side: "SELL" },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    }),
    prisma.position.findMany({
      where: { userId, shares: { gt: 0 } },
      select: {
        marketId: true,
        outcomeId: true,
        position: true,
        shares: true,
      },
    }),
  ]);

  const latestSellByPositionKey = new Map<string, (typeof sellOrders)[number]>();
  for (const sell of sellOrders) {
    if (sell.position == null) {
      continue;
    }

    const key = makeKey({
      marketId: sell.marketId,
      outcomeId: sell.outcomeId,
      position: sell.position,
    });

    if (!latestSellByPositionKey.has(key)) {
      latestSellByPositionKey.set(key, sell);
    }
  }

  const remainingSharesByPositionKey = new Map<string, number>();
  for (const position of positions) {
    const key = makeKey({
      marketId: position.marketId,
      outcomeId: position.outcomeId,
      position: position.position as "YES" | "NO",
    });

    remainingSharesByPositionKey.set(key, position.shares);
  }

  const map = new Map<string, MyEventMarketBetDTO>();

  for (const order of orders) {
    if (!map.has(order.marketId)) {
      map.set(order.marketId, {
        marketId: order.market.id,
        question: order.market.question,
        eventId: order.market.event.id,
        eventQuestion: order.market.event.question,
        closesAt: order.market.bettingCloseAt.toISOString(),
        resolvesAt: order.market.resolveAt?.toISOString() ?? null,
        status: order.market.status,
        resolvedOutcomeId: order.market.resolvedOutcomeId,
        resolvedPosition: order.market.resolvedPosition
          ? (order.market.resolvedPosition as "YES" | "NO")
          : null,
        latestBetAt: order.createdAt.toISOString(),
        bets: [],
      });
    }

    const market = map.get(order.marketId)!;
    const outcomeLabel =
      order.market.outcomes.find((outcome) => outcome.id === order.outcomeId)
        ?.label ?? "Unknown";
    const positionKey = makeKey({
      marketId: order.marketId,
      outcomeId: order.outcomeId,
      position: order.position as "YES" | "NO",
    });
    const remainingShares = remainingSharesByPositionKey.get(positionKey) ?? 0;
    const estimatedBoughtShares =
      order.price > 0 ? order.amount / order.price : 0;
    const isStillOpen =
      order.status !== "CANCELLED" && remainingShares > 0;

    const consumedShares = isStillOpen
      ? Math.min(remainingShares, estimatedBoughtShares)
      : 0;

    if (isStillOpen) {
      remainingSharesByPositionKey.set(positionKey, remainingShares - consumedShares);
    }

    const latestSell = latestSellByPositionKey.get(positionKey);

    const derivedStatus =
      order.status === "CANCELLED"
        ? "CANCELLED"
        : isStillOpen
          ? "OPEN"
          : "FILLED";

    const soldAmount = derivedStatus === "FILLED" ? latestSell?.amount : undefined;
    const soldShares =
      derivedStatus === "FILLED" && latestSell != null && latestSell.price > 0
        ? latestSell.amount / latestSell.price
        : undefined;
    const soldPrice =
      derivedStatus === "FILLED" && soldAmount != null && soldShares != null && soldShares > 0
        ? soldAmount / soldShares
        : undefined;
    const orderShares = soldShares ?? consumedShares;

    market.bets.push({
      orderId: order.id,
      outcomeId: order.outcomeId,
      outcomeLabel,
      position: order.position as "YES" | "NO",
      amount: order.amount,
      price: order.price,
      shares: orderShares,
      status: derivedStatus,
      createdAt: order.createdAt.toISOString(),
      soldAmount,
      soldPrice,
      soldAt: derivedStatus === "FILLED" ? latestSell?.createdAt.toISOString() : undefined,
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
