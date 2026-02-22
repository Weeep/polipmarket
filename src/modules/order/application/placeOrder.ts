import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { walletRepository } from "@/modules/wallet/infrastructure/walletRepository";
import { Order, OrderPosition, OrderSide } from "../domain/Order";
import { orderRepository } from "../infrastructure/orderRepository";
import { positionRepository } from "../infrastructure/positionRepository";
import { positionLotRepository } from "../infrastructure/positionLotRepository";
import { quoteOrder } from "./quoteOrder";
import { quoteSell } from "./quoteSell";
import { evaluateAchievementsForUser } from "@/modules/achievement/application/evaluateAchievementsForUser";

type PlaceOrderBuyInput = {
  userId: string;
  marketId: string;
  outcomeId: string;
  side: "BUY";
  position: OrderPosition;
  amount: number;
  maxSlippageBps?: number;
};

type PlaceOrderSellInput = {
  userId: string;
  marketId: string;
  outcomeId: string;
  side: "SELL";
  position: OrderPosition;
  shares: number;
  lotId?: string;
  maxSlippageBps?: number;
};

export type PlaceOrderInput = PlaceOrderBuyInput | PlaceOrderSellInput;

function validateSlippage(slippageBps: number, maxSlippageBps?: number) {
  if (maxSlippageBps != null && slippageBps > maxSlippageBps) {
    throw new Error("Slippage too high");
  }
}

function makeOrder(input: {
  userId: string;
  marketId: string;
  outcomeId: string;
  position: OrderPosition;
  side: OrderSide;
  amount: number;
  price: number;
}): Order {
  return {
    id: randomUUID(),
    userId: input.userId,
    marketId: input.marketId,
    outcomeId: input.outcomeId,
    position: input.position,
    side: input.side,
    price: input.price,
    amount: input.amount,
    status: "FILLED",
    createdAt: new Date(),
  };
}

export async function placeOrder(input: PlaceOrderInput) {
  return prisma.$transaction(async (tx) => {
    if (input.side === "BUY") {
      const quote = await quoteOrder(
        {
          marketId: input.marketId,
          outcomeId: input.outcomeId,
          position: input.position,
          amount: input.amount,
        },
        tx,
      );

      validateSlippage(quote.slippageBps, input.maxSlippageBps);

      const wallet = await tx.wallet.findUnique({
        where: { userId: input.userId },
      });

      if (!wallet || wallet.balance < input.amount) {
        throw new Error("Insufficient balance");
      }

      await walletRepository.lockFunds(input.userId, input.amount, tx);

      const order = makeOrder({
        userId: input.userId,
        marketId: input.marketId,
        outcomeId: input.outcomeId,
        position: input.position,
        side: "BUY",
        amount: input.amount,
        price: quote.executionPrice,
      });

      const created = await orderRepository.placeWithAmmUpdate(
        {
          order,
          side: "BUY",
          position: input.position,
          ammStakeAmount: quote.netAmount,
        },
        tx,
      );

      await positionRepository.addShares(
        {
          userId: input.userId,
          marketId: input.marketId,
          outcomeId: input.outcomeId,
          position: input.position,
          sharesToAdd: quote.estimatedShares,
          costPerShare: input.amount / quote.estimatedShares,
        },
        tx,
      );

      await positionLotRepository.createBuyLot(
        {
          userId: input.userId,
          marketId: input.marketId,
          outcomeId: input.outcomeId,
          position: input.position,
          buyOrderId: created.id,
          openedShares: quote.estimatedShares,
          entryPrice: quote.executionPrice,
          entryGrossAmount: input.amount,
          entryFee: quote.fee,
          entryNetAmount: quote.netAmount,
        },
        tx,
      );

      await evaluateAchievementsForUser({
        userId: input.userId,
        tx,
      });

      return created;
    }

    const currentPosition = await positionRepository.findByUserOutcome(
      input.userId,
      input.marketId,
      input.outcomeId,
      input.position,
      tx,
    );

    if (!currentPosition || currentPosition.shares <= 0) {
      throw new Error("Insufficient shares");
    }

    const sharesToSell = Math.min(input.shares, currentPosition.shares);

    const quote = await quoteSell(
      {
        marketId: input.marketId,
        outcomeId: input.outcomeId,
        position: input.position,
        shares: sharesToSell,
      },
      tx,
    );

    validateSlippage(quote.slippageBps, input.maxSlippageBps);

    const { removedCost } = await positionRepository.removeShares(
      {
        userId: input.userId,
        marketId: input.marketId,
        outcomeId: input.outcomeId,
        position: input.position,
        sharesToRemove: sharesToSell,
      },
      tx,
    );

    await tx.wallet.update({
      where: { userId: input.userId },
      data: {
        locked: { decrement: removedCost },
        balance: { increment: quote.netAmount },
      },
    });

    const order = makeOrder({
      userId: input.userId,
      marketId: input.marketId,
      outcomeId: input.outcomeId,
      position: input.position,
      side: "SELL",
      amount: quote.grossAmount,
      price: quote.executionPrice,
    });

    const createdSellOrder = await orderRepository.placeWithAmmUpdate(
      {
        order,
        side: "SELL",
        position: input.position,
        ammStakeAmount: quote.grossAmount,
      },
      tx,
    );

    await positionLotRepository.closeLotsForSell(
      {
        userId: input.userId,
        marketId: input.marketId,
        outcomeId: input.outcomeId,
        position: input.position,
        sellOrderId: createdSellOrder.id,
        preferredBuyLotId: input.lotId,
        sharesToClose: sharesToSell,
        grossAmount: quote.grossAmount,
        feeAmount: quote.fee,
        netAmount: quote.netAmount,
      },
      tx,
    );

    await evaluateAchievementsForUser({
      userId: input.userId,
      tx,
    });

    return {
      ...createdSellOrder,
      executionPrice: quote.executionPrice,
      grossAmount: quote.grossAmount,
      feeAmount: quote.fee,
      netAmount: quote.netAmount,
      shares: sharesToSell,
    };
  });
}
