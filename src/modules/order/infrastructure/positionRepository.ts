import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OrderPosition } from "../domain/Order";
import { Position } from "../domain/Position";

function parseOrderPosition(position: string): OrderPosition {
  if (position === "YES" || position === "NO") {
    return position;
  }

  throw new Error(`Invalid order position: ${position}`);
}

function toDomain(position: {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  position: string;
  shares: number;
  costBasis: number;
  createdAt: Date;
  updatedAt: Date;
}): Position {
  return {
    ...position,
    position: parseOrderPosition(position.position),
  };
}

type PositionKey = {
  userId: string;
  marketId: string;
  outcomeId: string;
  position: OrderPosition;
};

export type PositionRepository = {
  findByUserOutcome(
    userId: string,
    marketId: string,
    outcomeId: string,
    position: OrderPosition,
    tx?: Prisma.TransactionClient,
  ): Promise<Position | null>;
  addShares(
    input: PositionKey & {
      sharesToAdd: number;
      costPerShare: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Position>;
  removeShares(
    input: PositionKey & {
      sharesToRemove: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ position: Position | null; removedCost: number }>;
};

export const positionRepository: PositionRepository = {
  async findByUserOutcome(userId, marketId, outcomeId, position, tx) {
    const client = tx ?? prisma;

    const row = await client.position.findUnique({
      where: {
        userId_marketId_outcomeId_position: {
          userId,
          marketId,
          outcomeId,
          position,
        },
      },
    });

    return row ? toDomain(row) : null;
  },

  async addShares(input, tx) {
    if (input.sharesToAdd <= 0) {
      throw new Error("sharesToAdd must be greater than 0");
    }

    const client = tx ?? prisma;
    const existing = await this.findByUserOutcome(
      input.userId,
      input.marketId,
      input.outcomeId,
      input.position,
      client,
    );

    if (!existing) {
      const created = await client.position.create({
        data: {
          userId: input.userId,
          marketId: input.marketId,
          outcomeId: input.outcomeId,
          position: input.position,
          shares: input.sharesToAdd,
          costBasis: input.costPerShare,
        },
      });

      return toDomain(created);
    }

    const nextShares = existing.shares + input.sharesToAdd;
    const nextCostBasis =
      (existing.costBasis * existing.shares + input.costPerShare * input.sharesToAdd) /
      nextShares;

    const updated = await client.position.update({
      where: { id: existing.id },
      data: {
        shares: nextShares,
        costBasis: nextCostBasis,
      },
    });

    return toDomain(updated);
  },

  async removeShares(input, tx) {
    if (input.sharesToRemove <= 0) {
      throw new Error("sharesToRemove must be greater than 0");
    }

    const client = tx ?? prisma;
    const existing = await this.findByUserOutcome(
      input.userId,
      input.marketId,
      input.outcomeId,
      input.position,
      client,
    );

    if (!existing || existing.shares < input.sharesToRemove) {
      throw new Error("Insufficient shares");
    }

    const removedCost = existing.costBasis * input.sharesToRemove;
    const nextShares = existing.shares - input.sharesToRemove;

    if (nextShares <= 0) {
      await client.position.delete({
        where: { id: existing.id },
      });

      return { position: null, removedCost };
    }

    const updated = await client.position.update({
      where: { id: existing.id },
      data: {
        shares: nextShares,
      },
    });

    return { position: toDomain(updated), removedCost };
  },
};
