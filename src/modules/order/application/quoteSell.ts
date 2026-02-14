import { Prisma } from "@prisma/client";
import { DEFAULT_AMM_FEE_BPS, DEFAULT_OUTCOME_POOL } from "@/config/economy";
import { ammRepository } from "@/modules/market/infrastructure/ammRepository";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";
import { outcomeRepository } from "@/modules/market/infrastructure/outcomeRepository";
import { OrderPosition } from "../domain/Order";
import {
  applyNetAmountFromPool,
  calcExecutionPrice,
  calcNetAmountForSellShares,
  calcFee,
  calcGrossFromNetAfterFee,
  calcSlippageBps,
  validateFeeBps,
} from "../domain/ammQuote";

export type QuoteSellInput = {
  marketId: string;
  outcomeId: string;
  position: OrderPosition;
  shares: number;
};

export type QuoteSellResult = {
  marketId: string;
  outcomeId: string;
  position: OrderPosition;
  shares: number;
  executionPrice: number;
  grossAmount: number;
  fee: number;
  netAmount: number;
  slippageBps: number;
};

export async function quoteSell(
  input: QuoteSellInput,
  tx?: Prisma.TransactionClient,
): Promise<QuoteSellResult> {
  if (input.shares <= 0) {
    throw new Error("Shares must be greater than 0");
  }

  const market = await marketRepository.findById(input.marketId, tx);
  if (!market) {
    throw new Error("Market not found");
  }

  if (market.status !== "OPEN") {
    throw new Error("Market is not open");
  }

  if (market.bettingCloseAt <= new Date()) {
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

  const beforePool = {
    yesPool: liquidity?.yesPool ?? DEFAULT_OUTCOME_POOL,
    noPool: liquidity?.noPool ?? DEFAULT_OUTCOME_POOL,
  };

  const executionPrice = calcExecutionPrice(beforePool, input.position);

  if (executionPrice <= 0 || executionPrice >= 1) {
    throw new Error("Invalid quote price");
  }

  const netAmount = calcNetAmountForSellShares(beforePool, input.position, input.shares);
  const feeBps = ammConfig?.feeBps ?? DEFAULT_AMM_FEE_BPS;
  validateFeeBps(feeBps);

  const grossAmount = calcGrossFromNetAfterFee(netAmount, feeBps);
  const fee = calcFee(grossAmount, feeBps);

  const grossAmount = netAmount / (1 - feeRate);
  const fee = calcFee(grossAmount, feeBps);

  const afterPool = applyNetAmountFromPool(beforePool, input.position, netAmount);
  const afterPrice = calcExecutionPrice(afterPool, input.position);
  const slippageBps = calcSlippageBps(executionPrice, afterPrice);

  return {
    marketId: input.marketId,
    outcomeId: input.outcomeId,
    position: input.position,
    shares: input.shares,
    executionPrice: grossAmount / input.shares,
    grossAmount,
    fee,
    netAmount,
    slippageBps,
  };
}
