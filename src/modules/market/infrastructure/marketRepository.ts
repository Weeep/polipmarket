import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  AmmCurve,
  Market,
  MarketAmmConfig,
  MarketStatus,
  MarketType,
  Outcome,
  OutcomeStatus,
} from "../domain/Market";
import { DEFAULT_OUTCOME_POOL } from "@/config/economy";

type CreateOutcomeData = {
  slug: string;
  label: string;
  position: number;
  status?: OutcomeStatus;
};

type CreateAmmConfigData = {
  curve?: AmmCurve;
  feeBps?: number;
  lmsrB?: number | null;
};

type CreateMarketData = {
  question: string;
  description?: string | null;
  status: MarketStatus;
  type?: MarketType;
  closeAt: Date;
  createdBy: string;
  outcomes?: CreateOutcomeData[];
  ammConfig?: CreateAmmConfigData | null;
};

type MarketRecord = {
  id: string;
  question: string;
  description: string | null;
  status: string;
  type: string;
  closeAt: Date;
  createdBy: string;
  createdAt: Date;
  outcomes?: {
    id: string;
    marketId: string;
    slug: string;
    label: string;
    position: number;
    status: string;
    createdAt: Date;
  }[];
  ammConfig?: {
    id: string;
    marketId: string;
    curve: string;
    feeBps: number;
    lmsrB: number | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

function parseMarketStatus(status: string): MarketStatus {
  if (status === "OPEN" || status === "CLOSED" || status === "RESOLVED") {
    return status;
  }
  throw new Error(`Invalid market status: ${status}`);
}

function parseMarketType(type: string): MarketType {
  if (type === "BINARY" || type === "MULTI_CHOICE") {
    return type;
  }
  throw new Error(`Invalid market type: ${type}`);
}

function parseOutcomeStatus(status: string): OutcomeStatus {
  if (status === "ACTIVE" || status === "INACTIVE" || status === "RESOLVED") {
    return status;
  }
  throw new Error(`Invalid outcome status: ${status}`);
}

function parseAmmCurve(curve: string): AmmCurve {
  if (curve === "CPMM" || curve === "LMSR") {
    return curve;
  }
  throw new Error(`Invalid AMM curve: ${curve}`);
}

function mapOutcomeToDomain(
  outcome: NonNullable<MarketRecord["outcomes"]>[number],
): Outcome {
  return {
    ...outcome,
    status: parseOutcomeStatus(outcome.status),
  };
}

function mapAmmConfigToDomain(
  config: NonNullable<MarketRecord["ammConfig"]>,
): MarketAmmConfig {
  return {
    ...config,
    curve: parseAmmCurve(config.curve),
  };
}

function toDomain(market: MarketRecord): Market {
  return {
    id: market.id,
    question: market.question,
    description: market.description,
    status: parseMarketStatus(market.status),
    type: parseMarketType(market.type),
    closeAt: market.closeAt,
    createdBy: market.createdBy,
    createdAt: market.createdAt,
    outcomes: market.outcomes?.map(mapOutcomeToDomain),
    ammConfig: market.ammConfig ? mapAmmConfigToDomain(market.ammConfig) : null,
  };
}

export type MarketRepository = {
  create(
    data: CreateMarketData,
    tx?: Prisma.TransactionClient,
  ): Promise<Market>;
  findAll(tx?: Prisma.TransactionClient): Promise<Market[]>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Market | null>;
};

export const marketRepository: MarketRepository = {
  async create(data: CreateMarketData, tx): Promise<Market> {
    const client = tx ?? prisma;
    const created = await client.market.create({
      data: {
        question: data.question,
        description: data.description ?? null,
        status: data.status,
        type: data.type ?? "BINARY",
        closeAt: data.closeAt,
        createdBy: data.createdBy,
        outcomes:
          data.outcomes && data.outcomes.length > 0
            ? {
                create: data.outcomes.map((outcome) => ({
                  slug: outcome.slug,
                  label: outcome.label,
                  position: outcome.position,
                  status: outcome.status ?? "ACTIVE",
                  liquidity: {
                    create: {
                      yesPool: DEFAULT_OUTCOME_POOL,
                      noPool: DEFAULT_OUTCOME_POOL,
                    },
                  },
                })),
              }
            : undefined,
        ammConfig: data.ammConfig
          ? {
              create: {
                curve: data.ammConfig.curve ?? "CPMM",
                feeBps: data.ammConfig.feeBps ?? 100,
                lmsrB: data.ammConfig.lmsrB ?? null,
              },
            }
          : undefined,
      },
      include: {
        outcomes: {
          orderBy: { position: "asc" },
        },
        ammConfig: true,
      },
    });

    return toDomain(created);
  },

  async findAll(tx): Promise<Market[]> {
    const client = tx ?? prisma;
    const markets = await client.market.findMany({
      include: {
        outcomes: {
          orderBy: { position: "asc" },
        },
        ammConfig: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return markets.map(toDomain);
  },

  async findById(id: string, tx): Promise<Market | null> {
    const client = tx ?? prisma;
    const market = await client.market.findUnique({
      where: { id },
      include: {
        outcomes: {
          orderBy: { position: "asc" },
        },
        ammConfig: true,
      },
    });

    if (!market) return null;

    return toDomain(market);
  },
};
