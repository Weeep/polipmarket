import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { OrderPosition } from "@/modules/order/domain/Order";
import { AmmCurve, MarketAmmConfig } from "../domain/Market";

export type OutcomeLiquidity = {
  id: string;
  outcomeId: string;
  yesPool: number;
  noPool: number;
  updatedAt: Date;
};

type MarketAmmConfigRecord = {
  id: string;
  marketId: string;
  curve: string;
  feeBps: number;
  lmsrB: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function parseAmmCurve(curve: string): AmmCurve {
  if (curve === "CPMM" || curve === "LMSR") {
    return curve;
  }

  throw new Error(`Invalid AMM curve: ${curve}`);
}

function mapAmmConfigToDomain(config: MarketAmmConfigRecord): MarketAmmConfig {
  return {
    ...config,
    curve: parseAmmCurve(config.curve),
  };
}

export type AmmRepository = {
  findConfigByMarketId(
    marketId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<MarketAmmConfig | null>;
  findLiquidityByOutcomeId(
    outcomeId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<OutcomeLiquidity | null>;
  applyBuyToOutcomeLiquidity(
    input: {
      outcomeId: string;
      position: OrderPosition;
      amount: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<OutcomeLiquidity>;
};

export const ammRepository: AmmRepository = {
  async findConfigByMarketId(marketId, tx) {
    const client = tx ?? prisma;
    const config = await client.marketAmmConfig.findUnique({
      where: { marketId },
    });

    return config ? mapAmmConfigToDomain(config) : null;
  },

  async findLiquidityByOutcomeId(outcomeId, tx) {
    const client = tx ?? prisma;
    const liquidity = await client.outcomeLiquidity.findUnique({
      where: { outcomeId },
    });

    return liquidity;
  },

  async applyBuyToOutcomeLiquidity(input, tx) {
    const client = tx ?? prisma;

    return client.outcomeLiquidity.upsert({
      where: { outcomeId: input.outcomeId },
      update:
        input.position === "YES"
          ? { yesPool: { increment: input.amount } }
          : { noPool: { increment: input.amount } },
      create: {
        outcomeId: input.outcomeId,
        yesPool: input.position === "YES" ? input.amount : 0,
        noPool: input.position === "NO" ? input.amount : 0,
      },
    });
  },
};
