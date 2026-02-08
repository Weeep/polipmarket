import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import {
  createEventWithMarkets,
  CreateEventWithMarketsInput,
} from "@/modules/event/application/createEventWithMarkets";
import { prisma } from "@/lib/prisma";
import { outcomeRepository } from "@/modules/market/infrastructure/outcomeRepository";
import { ammRepository } from "@/modules/market/infrastructure/ammRepository";
import { calcExecutionPrice } from "@/modules/order/domain/ammQuote";
import { getMarketStats } from "@/modules/market/application/getMarketStats";
import { DEFAULT_OUTCOME_POOL } from "@/config/economy";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toCreateEventInput(
  body: Record<string, unknown>,
  userId: string,
): CreateEventWithMarketsInput {
  const bettingCloseValue = body.bettingCloseAt;
  const bettingCloseAt =
    bettingCloseValue instanceof Date
      ? bettingCloseValue
      : new Date(String(bettingCloseValue));
  const resolveAtValue = body.resolveAt;
  const resolveAt =
    resolveAtValue instanceof Date
      ? resolveAtValue
      : resolveAtValue != null
        ? new Date(String(resolveAtValue))
        : null;

  return {
    question: String(body.question ?? ""),
    description: typeof body.description === "string" ? body.description : null,
    bettingCloseAt,
    resolveAt,
    createdBy: userId,
    markets: Array.isArray(body.markets)
      ? body.markets.map((item) => {
          if (!item || typeof item !== "object") {
            throw new Error("Invalid market format");
          }
          const market = item as Record<string, unknown>;
          return {
            name: String(market.name ?? ""),
            description:
              typeof market.description === "string"
                ? market.description
                : null,
          };
        })
      : [],
  };
}

export const POST = withAuth(async (user, req) => {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const result = await createEventWithMarkets(
      toCreateEventInput(body, user.id),
    );

    return NextResponse.json(result.event, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Bad request") },
      { status: 400 },
    );
  }
});

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
    });

    const eventsWithMarkets = await Promise.all(
      events.map(async (event) => {
        const markets = await prisma.market.findMany({
          where: { eventId: event.id },
          orderBy: { createdAt: "desc" },
        });

        const marketsWithExtras = await Promise.all(
          markets.map(async (market) => {
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
            };
          }),
        );

        const eventStats = marketsWithExtras.reduce(
          (acc, market) => {
            acc.totalBets += market.marketStats?.totalMarketStats.totalBets ?? 0;
            acc.totalVolume +=
              market.marketStats?.totalMarketStats.totalVolume ?? 0;
            return acc;
          },
          { totalBets: 0, totalVolume: 0 },
        );

        return {
          ...event,
          markets: marketsWithExtras,
          eventStats,
        };
      }),
    );

    return NextResponse.json(eventsWithMarkets);
  } catch (err: unknown) {
    console.error("[GET /api/events]", err);
    return NextResponse.json(
      { error: getErrorMessage(err, "Internal server error") },
      { status: 500 },
    );
  }
}
