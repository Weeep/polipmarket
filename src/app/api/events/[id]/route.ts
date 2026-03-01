import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { outcomeRepository } from "@/modules/market/infrastructure/outcomeRepository";
import { ammRepository } from "@/modules/market/infrastructure/ammRepository";
import { calcExecutionPrice } from "@/modules/order/domain/ammQuote";
import { getMarketStats } from "@/modules/market/application/getMarketStats";
import { DEFAULT_OUTCOME_POOL } from "@/config/economy";
import { getSession } from "@/modules/auth/application/getSession";

type MarketRecord = Awaited<ReturnType<typeof prisma.market.findMany>>[number];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const markets = await prisma.market.findMany({
      where: {
        eventId: event.id,
        status: { notIn: ["PENDING_APPROVAL", "CANCELLED"] },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const userBetPositionsByMarketId = new Map<
      string,
      { yes: boolean; no: boolean }
    >();

    if (userId && markets.length > 0) {
      const buyOrders = await prisma.order.findMany({
        where: {
          userId,
          side: "BUY",
          status: { not: "CANCELLED" },
          marketId: { in: markets.map((market) => market.id) },
          position: { in: ["YES", "NO"] },
        },
        select: {
          marketId: true,
          position: true,
        },
      });

      for (const order of buyOrders) {
        const current =
          userBetPositionsByMarketId.get(order.marketId) ?? { yes: false, no: false };

        if (order.position === "YES") {
          current.yes = true;
        }

        if (order.position === "NO") {
          current.no = true;
        }

        userBetPositionsByMarketId.set(order.marketId, current);
      }
    }

    const marketsWithExtras = await Promise.all(
      markets.map(async (market: MarketRecord) => {
        const [outcomes, marketStats] = await Promise.all([
          outcomeRepository.findByMarketId(market.id),
          getMarketStats(market.id),
        ]);

        const outcomesWithPrices = await Promise.all(
          outcomes.map(async (outcome) => {
            const liquidity = await ammRepository.findLiquidityByOutcomeId(
              outcome.id,
            );
            const pool = {
              yesPool: liquidity?.yesPool ?? DEFAULT_OUTCOME_POOL,
              noPool: liquidity?.noPool ?? DEFAULT_OUTCOME_POOL,
            };

            return {
              ...outcome,
              yesPrice: calcExecutionPrice(pool, "YES"),
              noPrice: calcExecutionPrice(pool, "NO"),
            };
          }),
        );

        return {
          ...market,
          outcomes: outcomesWithPrices,
          marketStats,
          userBetPositions: userBetPositionsByMarketId.get(market.id) ?? {
            yes: false,
            no: false,
          },
        };
      }),
    );

    const eventStats = marketsWithExtras.reduce<{
      totalBets: number;
      totalVolume: number;
    }>(
      (
        acc: { totalBets: number; totalVolume: number },
        market: (typeof marketsWithExtras)[number],
      ) => {
        acc.totalBets += market.marketStats?.totalMarketStats.totalBets ?? 0;
        acc.totalVolume +=
          market.marketStats?.totalMarketStats.totalVolume ?? 0;
        return acc;
      },
      { totalBets: 0, totalVolume: 0 },
    );

    return NextResponse.json({
      ...event,
      markets: marketsWithExtras,
      eventStats,
    });
  } catch (err: unknown) {
    console.error("[GET /api/events/:id]", err);
    return NextResponse.json(
      { error: getErrorMessage(err, "Internal server error") },
      { status: 500 },
    );
  }
}
