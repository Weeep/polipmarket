import { randomUUID } from "crypto";
import { Order } from "../domain/Order";
import { orderRepository } from "../infrastructure/orderRepository";
import { prisma } from "@/lib/prisma";
import { walletRepository } from "@/modules/wallet/infrastructure/walletRepository";

interface PlaceOrderInput {
  userId: string;
  marketId: string;
  outcomeId: string;
  side: "BUY";
  price: number;
  amount: number;
}

export async function placeOrder(input: PlaceOrderInput) {
  if (input.price <= 0 || input.price >= 1) {
    throw new Error("Invalid price");
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { userId: input.userId },
    });

    if (!wallet || wallet.balance < input.amount) {
      throw new Error("Insufficient balance");
    }

    await walletRepository.lockFunds(input.userId, input.amount, tx);

    const order: Order = {
      id: crypto.randomUUID(),
      userId: input.userId,
      marketId: input.marketId,
      outcomeId: input.outcomeId,
      side: "BUY",
      price: input.price,
      amount: input.amount,
      status: "OPEN",
      createdAt: new Date(),
    };

    return await orderRepository.place(order, tx);

    //return order;
  });
}
