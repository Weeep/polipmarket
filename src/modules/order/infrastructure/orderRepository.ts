import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  Order,
  OrderSide,
  OrderStatus,
  TotalMarketStats,
  UserMarketStats,
} from "../domain/Order";
import { MarketStats } from "@/modules/market/domain/Market";

function toDomain(order: {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  side: string;
  price: number; // 0..1
  amount: number; // stake
  status: string;
  createdAt: Date;
}): Order {
  if (order.side !== "BUY" && order.side !== "SELL") {
    throw new Error(`Invalid order side: ${order.side}`);
  }

  if (
    order.status !== "OPEN" &&
    order.status !== "FILLED" &&
    order.status !== "CANCELLED"
  ) {
    throw new Error(`Invalid order status: ${order.status}`);
  }

  return {
    ...order,
    side: order.side as OrderSide,
    status: order.status as OrderStatus,
  };
}

export type OrderRepository = {
  place(data: Order, tx?: Prisma.TransactionClient): Promise<Order>;
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
    return toDomain(
      await client.order.create({
        data,
      }),
    );
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
    const [totalBets, totalVolumeAgg] = await Promise.all([
      prisma.order.count({
        where: {
          marketId,
          status: { not: "CANCELLED" },
        },
      }),
      prisma.order.aggregate({
        where: {
          marketId,
          status: { not: "CANCELLED" },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    if (!userId) {
      return {
        totalMarketStats: {
          totalBets,
          totalVolume: totalVolumeAgg._sum.amount ?? 0,
        },
        userMarketStats: {
          userBets: 0,
          userVolume: 0,
        },
      };
    }

    const [userBets, userVolumeAgg] = await Promise.all([
      prisma.order.count({
        where: {
          marketId,
          status: { not: "CANCELLED" },
          userId,
        },
      }),
      prisma.order.aggregate({
        where: {
          marketId,
          status: { not: "CANCELLED" },
          userId,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      totalMarketStats: {
        totalBets,
        totalVolume: totalVolumeAgg._sum.amount ?? 0,
      },
      userMarketStats: {
        userBets,
        userVolume: userVolumeAgg._sum.amount ?? 0,
      },
    };

    // return toDomain(
    //   await client.order.update({
    //     where: { id },
    //     data: { status },
    //   }),
    // );
  },
};
