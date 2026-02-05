import { prisma } from "@/lib/prisma";
import { Market, MarketStatus, MarketType } from "../domain/Market";

type CreateMarketData = {
  question: string;
  description?: string | null;
  status: MarketStatus;
  type?: MarketType;
  closeAt: Date;
  createdBy: string;
};

function toDomain(market: {
  id: string;
  question: string;
  description: string | null;
  status: string;
  type: string;
  closeAt: Date;
  createdBy: string;
  createdAt: Date;
}): Market {
  if (
    market.status !== "OPEN" &&
    market.status !== "CLOSED" &&
    market.status !== "RESOLVED"
  ) {
    throw new Error(`Invalid market status: ${market.status}`);
  }

  if (market.type !== "BINARY" && market.type !== "MULTI_CHOICE") {
    throw new Error(`Invalid market type: ${market.type}`);
  }

  return {
    ...market,
    status: market.status as MarketStatus,
    type: market.type as MarketType,
  };
}

export type MarketRepository = {
  create(data: CreateMarketData): Promise<Market>;
  findAll(): Promise<Market[]>;
  findById(id: string): Promise<Market | null>;
};

export const marketRepository: MarketRepository = {
  async create(data: CreateMarketData): Promise<Market> {
    const created = await prisma.market.create({
      data: {
        ...data,
        type: data.type ?? "BINARY",
      },
    });

    return toDomain(created);
  },

  async findAll(): Promise<Market[]> {
    const markets = await prisma.market.findMany({
      orderBy: { createdAt: "desc" },
    });

    return markets.map(toDomain);
  },

  async findById(id: string): Promise<Market | null> {
    const market = await prisma.market.findUnique({
      where: { id },
    });

    if (!market) return null;

    return toDomain(market);
  },
};
