import { prisma } from "@/lib/prisma";
import { DEFAULT_AMM_FEE_BPS } from "@/config/economy";
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
            ammConfig: {
              select: { feeBps: true },
            },
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
      include: {
        market: {
          include: {
            ammConfig: {
              select: { feeBps: true },
            },
          },
        },
      },
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

  const sellStatsByPositionKey = new Map<
    string,
    { grossAmount: number; netAmount: number; fee: number; shares: number; latestAt: Date }
  >();
  for (const sell of sellOrders) {
    if (sell.position == null || sell.price <= 0) {
      continue;
    }

    const key = makeKey({
      marketId: sell.marketId,
      outcomeId: sell.outcomeId,
      position: sell.position,
    });

    const feeBps = sell.market?.ammConfig?.feeBps ?? DEFAULT_AMM_FEE_BPS;
    const grossAmount = sell.amount;
    const fee = grossAmount * (feeBps / 10_000);
    const netAmount = grossAmount - fee;
    const shares = sell.amount / sell.price;
    const current = sellStatsByPositionKey.get(key);

    if (current) {
      current.grossAmount += grossAmount;
      current.netAmount += netAmount;
      current.fee += fee;
      current.shares += shares;
      if (sell.createdAt > current.latestAt) {
        current.latestAt = sell.createdAt;
      }
      continue;
    }

    sellStatsByPositionKey.set(key, {
      grossAmount,
      netAmount,
      fee,
      shares,
      latestAt: sell.createdAt,
    });
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
    const buyFeeBps = order.market.ammConfig?.feeBps ?? DEFAULT_AMM_FEE_BPS;
    const netBuyAmount = order.amount * (1 - buyFeeBps / 10_000);
    const estimatedBoughtShares =
      order.price > 0 ? netBuyAmount / order.price : 0;
    const isStillOpen =
      order.status !== "CANCELLED" && remainingShares > 0;

    const consumedShares = isStillOpen
      ? Math.min(remainingShares, estimatedBoughtShares)
      : 0;

    if (isStillOpen) {
      remainingSharesByPositionKey.set(positionKey, remainingShares - consumedShares);
    }

    const sellStats = sellStatsByPositionKey.get(positionKey);

    const derivedStatus =
      order.status === "CANCELLED"
        ? "CANCELLED"
        : isStillOpen
          ? "OPEN"
          : "FILLED";

    const averageGrossSellPrice =
      sellStats != null && sellStats.shares > 0
        ? sellStats.grossAmount / sellStats.shares
        : undefined;
    const soldShares = derivedStatus === "FILLED" ? sellStats?.shares : undefined;
    const soldPrice = derivedStatus === "FILLED" ? averageGrossSellPrice : undefined;
    const soldGrossAmount = derivedStatus === "FILLED" ? sellStats?.grossAmount : undefined;
    const soldFee = derivedStatus === "FILLED" ? sellStats?.fee : undefined;
    const soldNetAmount = derivedStatus === "FILLED" ? sellStats?.netAmount : undefined;
    const soldAmount = soldNetAmount;
    const orderShares = derivedStatus === "FILLED" ? estimatedBoughtShares : consumedShares;

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
      soldShares,
      soldGrossAmount,
      soldFee,
      soldNetAmount,
      soldAt: derivedStatus === "FILLED" ? sellStats?.latestAt.toISOString() : undefined,
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
