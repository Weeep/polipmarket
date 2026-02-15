import { prisma } from "@/lib/prisma";
import { DEFAULT_AMM_FEE_BPS } from "@/config/economy";
import { MyEventMarketBetDTO } from "../dto/myEventMarketBetDTO";
import { allocateSellLotsToBuys } from "./sellAllocation";

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

  const remainingSharesByPositionKey = new Map<string, number>();
  for (const position of positions) {
    const key = makeKey({
      marketId: position.marketId,
      outcomeId: position.outcomeId,
      position: position.position as "YES" | "NO",
    });

    remainingSharesByPositionKey.set(key, position.shares);
  }

  const buyOrdersByPositionKey = new Map<
    string,
    Array<{
      id: string;
      createdAt: Date;
      boughtShares: number;
      status: string;
    }>
  >();

  for (const order of orders) {
    if (order.position == null) continue;
    const key = makeKey({
      marketId: order.marketId,
      outcomeId: order.outcomeId,
      position: order.position as "YES" | "NO",
    });
    const buyFeeBps = order.market.ammConfig?.feeBps ?? DEFAULT_AMM_FEE_BPS;
    const netBuyAmount = order.amount * (1 - buyFeeBps / 10_000);
    const boughtShares = order.price > 0 ? netBuyAmount / order.price : 0;
    const current = buyOrdersByPositionKey.get(key) ?? [];
    current.push({
      id: order.id,
      createdAt: order.createdAt,
      boughtShares,
      status: order.status,
    });
    buyOrdersByPositionKey.set(key, current);
  }

  const sellOrdersByPositionKey = new Map<
    string,
    Array<{
      createdAt: Date;
      shares: number;
      grossAmount: number;
      fee: number;
      netAmount: number;
    }>
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

    const current = sellOrdersByPositionKey.get(key) ?? [];
    current.push({ createdAt: sell.createdAt, shares, grossAmount, fee, netAmount });
    sellOrdersByPositionKey.set(key, current);
  }

  const allocationByBuyOrderId = new Map<
    string,
    {
      status: "OPEN" | "FILLED";
      openShares: number;
      soldShares?: number;
      soldPrice?: number;
      soldGrossAmount?: number;
      soldFee?: number;
      soldNetAmount?: number;
    }
  >();

  for (const [key, buyLots] of buyOrdersByPositionKey.entries()) {
    const activeBuyLots = buyLots.filter((buy) => buy.status !== "CANCELLED");
    const remainingShares = remainingSharesByPositionKey.get(key) ?? 0;
    const sells = sellOrdersByPositionKey.get(key) ?? [];
    const allocation = allocateSellLotsToBuys({
      buys: activeBuyLots.map((buy) => ({
        buyOrderId: buy.id,
        createdAt: buy.createdAt,
        boughtShares: buy.boughtShares,
      })),
      sells,
      remainingShares,
    });

    for (const [buyOrderId, view] of allocation.entries()) {
      allocationByBuyOrderId.set(buyOrderId, {
        status: view.status,
        openShares: view.openShares,
        soldShares: view.soldShares,
        soldPrice: view.soldPrice,
        soldGrossAmount: view.soldGrossAmount,
        soldFee: view.soldFee,
        soldNetAmount: view.soldNetAmount,
      });
    }
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
    const allocation = allocationByBuyOrderId.get(order.id);

    const derivedStatus =
      order.status === "CANCELLED"
        ? "CANCELLED"
        : allocation?.status === "FILLED"
          ? "FILLED"
          : "OPEN";

    market.bets.push({
      orderId: order.id,
      outcomeId: order.outcomeId,
      outcomeLabel,
      position: order.position as "YES" | "NO",
      amount: order.amount,
      price: order.price,
      shares: allocation?.openShares ?? 0,
      status: derivedStatus,
      createdAt: order.createdAt.toISOString(),
      soldAmount: allocation?.soldNetAmount,
      soldPrice: allocation?.soldPrice,
      soldShares: allocation?.soldShares,
      soldGrossAmount: allocation?.soldGrossAmount,
      soldFee: allocation?.soldFee,
      soldNetAmount: allocation?.soldNetAmount,
      soldAt: derivedStatus === "FILLED" ? order.createdAt.toISOString() : undefined,
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
