import { NextResponse } from "next/server";
import { getMarketStats } from "@/modules/market/application/getMarketStats";
import { getMarketById } from "@/modules/market/application/getMarkets";
import { DEFAULT_OUTCOME_POOL } from "@/config/economy";
import { ammRepository } from "@/modules/market/infrastructure/ammRepository";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";
import { outcomeRepository } from "@/modules/market/infrastructure/outcomeRepository";
import { calcExecutionPrice } from "@/modules/order/domain/ammQuote";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const market = await getMarketById(marketRepository, id);

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const include = new Set(
      (searchParams.get("include") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );

    const includeOutcomes = include.has("outcomes") || include.has("prices");
    const includePrices = include.has("prices");
    const includeStats =
      include.has("stats") || include.has("prices") || include.has("outcomes");

    if (!includeOutcomes && !includeStats) {
      return NextResponse.json(market);
    }

    const [outcomes, marketStats] = await Promise.all([
      includeOutcomes
        ? outcomeRepository.findByMarketId(market.id)
        : Promise.resolve(undefined),
      includeStats ? getMarketStats(market.id) : Promise.resolve(undefined),
    ]);

    const outcomesWithPrices = includePrices && outcomes
      ? await Promise.all(
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
        )
      : outcomes;

    return NextResponse.json({
      ...market,
      outcomes: outcomesWithPrices,
      marketStats: marketStats ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
