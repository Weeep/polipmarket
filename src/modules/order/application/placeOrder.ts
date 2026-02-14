import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { walletRepository } from "@/modules/wallet/infrastructure/walletRepository";
import { Order, OrderPosition, OrderSide } from "../domain/Order";
import { orderRepository } from "../infrastructure/orderRepository";
import { positionRepository } from "../infrastructure/positionRepository";
import { quoteOrder } from "./quoteOrder";
import { quoteSell } from "./quoteSell";

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
    status: "OPEN",
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
          executionPrice: quote.executionPrice,
        },
        tx,
      );

      return created;
    }

    const quote = await quoteSell(
      {
        marketId: input.marketId,
        outcomeId: input.outcomeId,
        position: input.position,
        shares: input.shares,
      },
      tx,
    );

    validateSlippage(quote.slippageBps, input.maxSlippageBps);

    await positionRepository.removeShares(
      {
        userId: input.userId,
        marketId: input.marketId,
        outcomeId: input.outcomeId,
        position: input.position,
        sharesToRemove: input.shares,
      },
      tx,
    );

    await tx.wallet.update({
      where: { userId: input.userId },
      data: {
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

    return orderRepository.placeWithAmmUpdate(
      {
        order,
        side: "SELL",
        position: input.position,
        ammStakeAmount: quote.netAmount,
      },
      tx,
    );
  });
}
