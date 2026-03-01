import { marketRepository } from "../infrastructure/marketRepository";
import { outcomeRepository } from "../infrastructure/outcomeRepository";
import { ammRepository } from "../infrastructure/ammRepository";
import { calcExecutionPrice } from "@/modules/order/domain/ammQuote";
import { DEFAULT_OUTCOME_POOL } from "@/config/economy";
import { getMarketStats } from "./getMarketStats";
import { prisma } from "@/lib/prisma";

export async function getMarketsByEventId(eventId: string, userId?: string) {
  if (!eventId) {
    return [];
  }

  const markets = await marketRepository.findByEventId(eventId);
  const visibleMarkets = markets.filter(
    (market) =>
      market.status !== "PENDING_APPROVAL" && market.status !== "CANCELLED",
  );

  const userBetPositionsByMarketId = new Map<
    string,
    { yes: boolean; no: boolean }
  >();

  if (userId && visibleMarkets.length > 0) {
    const openPositions = await prisma.position.findMany({
      where: {
        userId,
        marketId: { in: visibleMarkets.map((market) => market.id) },
        shares: { gt: 0 },
        position: { in: ["YES", "NO"] },
      },
      select: {
        marketId: true,
        position: true,
      },
    });

    for (const openPosition of openPositions) {
      const current =
        userBetPositionsByMarketId.get(openPosition.marketId) ?? {
          yes: false,
          no: false,
        };

      if (openPosition.position === "YES") {
        current.yes = true;
      }

      if (openPosition.position === "NO") {
        current.no = true;
      }

      userBetPositionsByMarketId.set(openPosition.marketId, current);
    }
  }

  return Promise.all(
    visibleMarkets.map(async (market) => {
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
}
