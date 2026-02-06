import { Prisma } from "@prisma/client";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";
import { ammRepository } from "@/modules/market/infrastructure/ammRepository";
import { outcomeRepository } from "@/modules/market/infrastructure/outcomeRepository";
import { OrderPosition } from "../domain/Order";
import {
  applyNetAmountToPool,
  calcExecutionPrice,
  calcFee,
  calcSlippageBps,
} from "../domain/ammQuote";
import { DEFAULT_OUTCOME_POOL } from "@/config/economy";

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

export async function quoteOrder(
  input: QuoteOrderInput,
  tx?: Prisma.TransactionClient,
): Promise<QuoteOrderResult> {
  if (input.amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const market = await marketRepository.findById(input.marketId, tx);
  if (!market) {
    throw new Error("Market not found");
  }

  if (market.status !== "OPEN") {
    throw new Error("Market is not open");
  }

  if (market.closeAt <= new Date()) {
    throw new Error("Market is closed");
  }

  await outcomeRepository.ensureBelongsToMarket(
    input.marketId,
    input.outcomeId,
    tx,
  );

  const [ammConfig, liquidity] = await Promise.all([
    ammRepository.findConfigByMarketId(input.marketId, tx),
    ammRepository.findLiquidityByOutcomeId(input.outcomeId, tx),
  ]);

  const feeBps = ammConfig?.feeBps ?? 100;
  const fee = calcFee(input.amount, feeBps);
  const netAmount = input.amount - fee;

  if (netAmount <= 0) {
    throw new Error("Amount too low after fees");
  }

  const beforePool = {
    yesPool: liquidity?.yesPool ?? DEFAULT_OUTCOME_POOL,
    noPool: liquidity?.noPool ?? DEFAULT_OUTCOME_POOL,
  };

  const executionPrice = calcExecutionPrice(beforePool, input.position);

  if (executionPrice <= 0 || executionPrice >= 1) {
    throw new Error("Invalid quote price");
  }

  const afterPool = applyNetAmountToPool(beforePool, input.position, netAmount);
  const afterPrice = calcExecutionPrice(afterPool, input.position);
  const slippageBps = calcSlippageBps(executionPrice, afterPrice);

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
