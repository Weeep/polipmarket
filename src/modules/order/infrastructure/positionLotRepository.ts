import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OrderPosition } from "../domain/Order";

type TxLike = Prisma.TransactionClient | typeof prisma;

type OpenLotRow = {
  id: string;
  remainingShares: number;
};

export const positionLotRepository = {
  async createBuyLot(input: {
    userId: string;
    marketId: string;
    outcomeId: string;
    position: OrderPosition;
    buyOrderId: string;
    openedShares: number;
    entryPrice: number;
    entryGrossAmount: number;
    entryFee: number;
    entryNetAmount: number;
  }, tx?: TxLike): Promise<void> {
    const client = tx ?? prisma;

    await client.$executeRaw`
      INSERT INTO "PositionLot" (
        "id", "userId", "marketId", "outcomeId", "position", "buyOrderId",
        "openedShares", "remainingShares", "entryPrice", "entryGrossAmount", "entryFee", "entryNetAmount",
        "createdAt", "updatedAt"
      ) VALUES (
        ${randomUUID()}, ${input.userId}, ${input.marketId}, ${input.outcomeId}, ${input.position}, ${input.buyOrderId},
        ${input.openedShares}, ${input.openedShares}, ${input.entryPrice}, ${input.entryGrossAmount}, ${input.entryFee}, ${input.entryNetAmount},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;
  },

  async closeLotsForSell(input: {
    userId: string;
    marketId: string;
    outcomeId: string;
    position: OrderPosition;
    sellOrderId: string;
    sharesToClose: number;
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
  }, tx?: TxLike): Promise<void> {
    const client = tx ?? prisma;

    const lots = await client.$queryRaw<OpenLotRow[]>`
      SELECT "id", "remainingShares"
      FROM "PositionLot"
      WHERE "userId" = ${input.userId}
        AND "marketId" = ${input.marketId}
        AND "outcomeId" = ${input.outcomeId}
        AND "position" = ${input.position}
        AND "remainingShares" > 0
      ORDER BY "createdAt" ASC, "id" ASC
    `;

    let remainingShares = input.sharesToClose;

    for (const lot of lots) {
      if (remainingShares <= 0) {
        break;
      }

      const closedShares = Math.min(lot.remainingShares, remainingShares);
      const ratio = closedShares / input.sharesToClose;
      const grossAmount = input.grossAmount * ratio;
      const feeAmount = input.feeAmount * ratio;
      const netAmount = input.netAmount * ratio;

      await client.$executeRaw`
        UPDATE "PositionLot"
        SET "remainingShares" = "remainingShares" - ${closedShares},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${lot.id}
      `;

      await client.$executeRaw`
        INSERT INTO "LotClose" (
          "id", "sellOrderId", "buyLotId", "closedShares", "grossAmount", "feeAmount", "netAmount", "createdAt"
        ) VALUES (
          ${randomUUID()}, ${input.sellOrderId}, ${lot.id}, ${closedShares}, ${grossAmount}, ${feeAmount}, ${netAmount}, CURRENT_TIMESTAMP
        )
      `;

      remainingShares -= closedShares;
    }

    if (remainingShares > 0.000001) {
      throw new Error("Insufficient lot shares");
    }
  },
};
