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

export type PositionRepository = {
  findByUserOutcome(
    userId: string,
    marketId: string,
    outcomeId: string,
    position: OrderPosition,
    tx?: Prisma.TransactionClient,
  ): Promise<Position | null>;
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
};
