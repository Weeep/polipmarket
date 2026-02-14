import { prisma } from "@/lib/prisma";
import { MyEventMarketBetDTO } from "../dto/myEventMarketBetDTO";

function makeKey(input: {
  marketId: string;
  outcomeId: string;
  position: "YES" | "NO";
}) {
  return `${input.marketId}:${input.outcomeId}:${input.position}`;
}

type SellSlice = {
  remainingShares: number;
  netAmountPerShare: number;
  soldAt: string;
};

const SHARE_EPSILON = 1e-9;

export async function getMyEventMarkets(
  userId: string,
  limit = 5,
): Promise<MyEventMarketBetDTO[]> {
  const [buyOrders, sellOrders, positions] = await Promise.all([
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
        createdAt: "asc",
      },
      take: 200,
    }),
    prisma.order.findMany({
      where: { userId, side: "SELL" },
      include: {
        market: {
          include: {
            event: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 200,
    }),
  ]);

  const chronologicalSells = [...sellOrders].reverse();

  const remainingOpenSharesByPositionKey = new Map<string, number>();
  for (const position of positions) {
    const key = makeKey({
      marketId: position.marketId,
      outcomeId: position.outcomeId,
      position: position.position as "YES" | "NO",
    });

    remainingOpenSharesByPositionKey.set(key, position.shares);
  }

  const sellQueuesByPositionKey = new Map<string, SellSlice[]>();

  for (const sell of chronologicalSells) {
    if (sell.position == null || sell.price <= 0) {
      continue;
    }

    const key = makeKey({
      marketId: sell.marketId,
      outcomeId: sell.outcomeId,
      position: sell.position,
    });

    const feeRate = Math.max(0, Math.min(1, sell.market.event.feeBps / 10_000));
    const netAmount = sell.amount * (1 - feeRate);
    const soldShares = sell.amount / sell.price;

    if (soldShares <= 0) {
      continue;
    }

    const netAmountPerShare = netAmount / soldShares;

    const queue = sellQueuesByPositionKey.get(key) ?? [];
    queue.push({
      remainingShares: soldShares,
      netAmountPerShare,
      soldAt: sell.createdAt.toISOString(),
    });
    sellQueuesByPositionKey.set(key, queue);
  }

  const map = new Map<string, MyEventMarketBetDTO>();

  for (const order of buyOrders) {
    if (!map.has(order.marketId)) {
      map.set(order.marketId, {
        marketId: order.market.id,
        question: order.market.question,
        eventId: order.market.event.id,
        eventQuestion: order.market.event.question,
        feeBps: order.market.event.feeBps,
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

    const boughtShares = order.price > 0 ? order.amount / order.price : 0;
    let remainingSharesToMatchSell = boughtShares;
    let soldShares = 0;
    let soldNetAmount = 0;
    let soldAt: string | undefined;

    const queue = sellQueuesByPositionKey.get(positionKey) ?? [];

    while (remainingSharesToMatchSell > SHARE_EPSILON && queue.length > 0) {
      const currentSell = queue[0];
      const matchedShares = Math.min(remainingSharesToMatchSell, currentSell.remainingShares);

      soldShares += matchedShares;
      soldNetAmount += matchedShares * currentSell.netAmountPerShare;
      remainingSharesToMatchSell -= matchedShares;
      currentSell.remainingShares -= matchedShares;
      soldAt = currentSell.soldAt;

      if (currentSell.remainingShares <= SHARE_EPSILON) {
        queue.shift();
      }
    }

    const remainingOpenSharesForPosition =
      remainingOpenSharesByPositionKey.get(positionKey) ?? 0;
    const openSharesForThisOrder =
      order.status === "CANCELLED"
        ? 0
        : Math.min(remainingOpenSharesForPosition, boughtShares);

    if (openSharesForThisOrder > 0) {
      remainingOpenSharesByPositionKey.set(
        positionKey,
        remainingOpenSharesForPosition - openSharesForThisOrder,
      );
    }

    const derivedStatus =
      order.status === "CANCELLED"
        ? "CANCELLED"
        : openSharesForThisOrder > SHARE_EPSILON
          ? "OPEN"
          : "FILLED";

    market.bets.push({
      orderId: order.id,
      outcomeId: order.outcomeId,
      outcomeLabel,
      position: order.position as "YES" | "NO",
      amount: order.amount,
      price: order.price,
      status: derivedStatus,
      createdAt: order.createdAt.toISOString(),
      soldAmount: derivedStatus === "FILLED" ? soldNetAmount : undefined,
      soldPrice:
        derivedStatus === "FILLED" && soldShares > SHARE_EPSILON
          ? soldNetAmount / soldShares
          : undefined,
      soldAt: derivedStatus === "FILLED" ? soldAt : undefined,
    });

    if (order.createdAt > new Date(market.latestBetAt)) {
      market.latestBetAt = order.createdAt.toISOString();
    }
  }

  for (const market of map.values()) {
    market.bets.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return Array.from(map.values())
    .sort(
      (a, b) =>
        Math.abs(new Date(a.latestBetAt).getTime() - Date.now()) -
        Math.abs(new Date(b.latestBetAt).getTime() - Date.now()),
    )
    .slice(0, limit);
}
