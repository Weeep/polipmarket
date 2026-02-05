import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { walletRepository } from "@/modules/wallet/infrastructure/walletRepository";
import { Order, OrderPosition } from "../domain/Order";
import { orderRepository } from "../infrastructure/orderRepository";
import { quoteOrder } from "./quoteOrder";

export interface PlaceOrderInput {
  userId: string;
  marketId: string;
  outcomeId: string;
  side: "BUY";
  position: OrderPosition;
  amount: number;
  maxSlippageBps?: number;
}

export async function placeOrder(input: PlaceOrderInput) {
  return prisma.$transaction(async (tx) => {
    const quote = await quoteOrder(
      {
        marketId: input.marketId,
        outcomeId: input.outcomeId,
        position: input.position,
        amount: input.amount,
      },
      tx,
    );

    if (
      input.maxSlippageBps != null &&
      quote.slippageBps > input.maxSlippageBps
    ) {
      throw new Error("Slippage too high");
    }

    const wallet = await tx.wallet.findUnique({
      where: { userId: input.userId },
    });

    if (!wallet || wallet.balance < input.amount) {
      throw new Error("Insufficient balance");
    }

    await walletRepository.lockFunds(input.userId, input.amount, tx);

    const order: Order = {
      id: randomUUID(),
      userId: input.userId,
      marketId: input.marketId,
      outcomeId: input.outcomeId,
      position: input.position,
      side: input.side,
      price: quote.executionPrice,
      amount: input.amount,
      status: "OPEN",
      createdAt: new Date(),
    };

    return orderRepository.placeWithAmmUpdate(
      {
        order,
        position: input.position,
        ammStakeAmount: quote.netAmount,
      },
      tx,
    );
  });
}
