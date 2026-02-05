import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { MarketStats } from "@/modules/market/domain/Market";
import { ammRepository } from "@/modules/market/infrastructure/ammRepository";
import { outcomeRepository } from "@/modules/market/infrastructure/outcomeRepository";
import { Order, OrderPosition, OrderSide, OrderStatus } from "../domain/Order";

function parseOrderSide(side: string): OrderSide {
  if (side === "BUY" || side === "SELL") {
    return side;
  }

  throw new Error(`Invalid order side: ${side}`);
}

function parseOrderStatus(status: string): OrderStatus {
  if (status === "OPEN" || status === "FILLED" || status === "CANCELLED") {
    return status;
  }

  throw new Error(`Invalid order status: ${status}`);
}

function toDomain(order: {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  side: string;
  price: number;
  amount: number;
  status: string;
  createdAt: Date;
}): Order {
  return {
    ...order,
    side: parseOrderSide(order.side),
    status: parseOrderStatus(order.status),
  };
}

async function fetchMarketStats(marketId: string, userId?: string) {
  const where = {
    marketId,
    status: { not: "CANCELLED" as const },
    ...(userId ? { userId } : {}),
  };

  const [totalBets, totalVolumeAgg] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where,
      _sum: {
        amount: true,
      },
    }),
  ]);

  return {
    totalBets,
    totalVolume: totalVolumeAgg._sum.amount ?? 0,
  };
}

async function ensureValidOutcome(
  client: Prisma.TransactionClient | typeof prisma,
  marketId: string,
  outcomeId: string,
) {
  await outcomeRepository.ensureBelongsToMarket(marketId, outcomeId, client);
}

export type PlaceWithAmmInput = {
  order: Order;
  position: OrderPosition;
  ammStakeAmount: number;
};

export type OrderRepository = {
  place(data: Order, tx?: Prisma.TransactionClient): Promise<Order>;
  placeWithAmmUpdate(
    input: PlaceWithAmmInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Order>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Order | null>;
  findOpensByMarket(marketId: string): Promise<Order[]>;
  updateStatus(
    id: string,
    status: Order["status"],
    tx?: Prisma.TransactionClient,
  ): Promise<Order>;
  getMarketStats(marketId: string, userId?: string): Promise<MarketStats>;
};

export const orderRepository: OrderRepository = {
  async place(data, tx) {
    const client = tx ?? prisma;
    await ensureValidOutcome(client, data.marketId, data.outcomeId);

    return toDomain(
      await client.order.create({
        data,
      }),
    );
  },

  async placeWithAmmUpdate(input, tx) {
    const runner = async (client: Prisma.TransactionClient) => {
      await ensureValidOutcome(client, input.order.marketId, input.order.outcomeId);

      await ammRepository.applyBuyToOutcomeLiquidity(
        {
          outcomeId: input.order.outcomeId,
          position: input.position,
          amount: input.ammStakeAmount,
        },
        client,
      );

      const created = await client.order.create({ data: input.order });
      return toDomain(created);
    };

    if (tx) {
      return runner(tx);
    }

    return prisma.$transaction(async (transactionClient) => runner(transactionClient));
  },

  async findById(id, tx) {
    const client = tx ?? prisma;
    const result = await client.order.findUnique({
      where: { id },
    });

    return result === null ? null : toDomain(result);
  },

  async findOpensByMarket(marketId) {
    const result = await prisma.order.findMany({
      where: {
        marketId,
        status: "OPEN",
      },
    });

    return result.map(toDomain);
  },

  async updateStatus(id, status, tx) {
    const client = tx ?? prisma;

    return toDomain(
      await client.order.update({
        where: { id },
        data: { status },
      }),
    );
  },

  async getMarketStats(marketId, userId) {
    const totalStats = await fetchMarketStats(marketId);

    if (!userId) {
      return {
        totalMarketStats: {
          totalBets: totalStats.totalBets,
          totalVolume: totalStats.totalVolume,
        },
        userMarketStats: {
          userBets: 0,
          userVolume: 0,
        },
      };
    }

    const userStats = await fetchMarketStats(marketId, userId);

    return {
      totalMarketStats: {
        totalBets: totalStats.totalBets,
        totalVolume: totalStats.totalVolume,
      },
      userMarketStats: {
        userBets: userStats.totalBets,
        userVolume: userStats.totalVolume,
      },
    };
  },
};
