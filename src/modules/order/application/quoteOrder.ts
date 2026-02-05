import { marketRepository } from "@/modules/market/infrastructure/marketRepository";
import { ammRepository } from "@/modules/market/infrastructure/ammRepository";
import { outcomeRepository } from "@/modules/market/infrastructure/outcomeRepository";
import { OrderPosition } from "../domain/Order";

export type QuoteOrderInput = {
  marketId: string;
  outcomeId: string;
  position: OrderPosition;
  amount: number;
};

export type QuoteOrderResult = {
  marketId: string;
  outcomeId: string;
  position: OrderPosition;
  amount: number;
  fee: number;
  netAmount: number;
  executionPrice: number;
  estimatedShares: number;
  slippageBps: number;
};

const DEFAULT_POOL = 100;

export async function quoteOrder(input: QuoteOrderInput): Promise<QuoteOrderResult> {
  if (input.amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const market = await marketRepository.findById(input.marketId);
  if (!market) {
    throw new Error("Market not found");
  }

  if (market.status !== "OPEN") {
    throw new Error("Market is not open");
  }

  if (market.closeAt <= new Date()) {
    throw new Error("Market is closed");
  }

  await outcomeRepository.ensureBelongsToMarket(input.marketId, input.outcomeId);

  const [ammConfig, liquidity] = await Promise.all([
    ammRepository.findConfigByMarketId(input.marketId),
    ammRepository.findLiquidityByOutcomeId(input.outcomeId),
  ]);

  const feeBps = ammConfig?.feeBps ?? 100;
  const feeRate = feeBps / 10_000;
  const fee = input.amount * feeRate;
  const netAmount = input.amount - fee;

  if (netAmount <= 0) {
    throw new Error("Amount too low after fees");
  }

  const yesPool = liquidity?.yesPool ?? DEFAULT_POOL;
  const noPool = liquidity?.noPool ?? DEFAULT_POOL;
  const totalPool = yesPool + noPool;

  if (totalPool <= 0) {
    throw new Error("Invalid AMM liquidity state");
  }

  const yesProbability = yesPool / totalPool;
  const executionPrice = input.position === "YES" ? yesProbability : 1 - yesProbability;

  if (executionPrice <= 0 || executionPrice >= 1) {
    throw new Error("Invalid quote price");
  }

  const afterYesPool = input.position === "YES" ? yesPool + netAmount : yesPool;
  const afterNoPool = input.position === "NO" ? noPool + netAmount : noPool;
  const afterPrice =
    input.position === "YES"
      ? afterYesPool / (afterYesPool + afterNoPool)
      : 1 - afterYesPool / (afterYesPool + afterNoPool);

  const slippageBps = Math.abs(afterPrice - executionPrice) / executionPrice * 10_000;

  return {
    marketId: input.marketId,
    outcomeId: input.outcomeId,
    position: input.position,
    amount: input.amount,
    fee,
    netAmount,
    executionPrice,
    estimatedShares: netAmount / executionPrice,
    slippageBps,
  };
}
