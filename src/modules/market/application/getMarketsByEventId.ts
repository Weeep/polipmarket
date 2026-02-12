import { marketRepository } from "../infrastructure/marketRepository";
import { outcomeRepository } from "../infrastructure/outcomeRepository";
import { ammRepository } from "../infrastructure/ammRepository";
import { calcExecutionPrice } from "@/modules/order/domain/ammQuote";
import { DEFAULT_OUTCOME_POOL } from "@/config/economy";
import { getMarketStats } from "./getMarketStats";

export async function getMarketsByEventId(eventId: string) {
  if (!eventId) {
    return [];
  }

  const markets = await marketRepository.findByEventId(eventId);

  return Promise.all(
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
}
