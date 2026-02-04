import { prisma } from "@/lib/prisma";
import { orderRepository } from "../infrastructure/orderRepository";
import { walletRepository } from "@/modules/wallet/infrastructure/walletRepository";

export async function cancelOrder(input: { orderId: string; userId: string }) {
  return prisma.$transaction(async (tx) => {
    const order = await orderRepository.findById(input.orderId, tx);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId !== input.userId) {
      throw new Error("Forbidden");
    }

    if (order.status !== "OPEN") {
      throw new Error("Only OPEN orders can be cancelled");
    }

    // 🔓 UNLOCK FUNDS
    await walletRepository.unlockFunds(order.userId, order.amount, tx);

    // ❌ CANCEL ORDER
    const cancelledOrder = await orderRepository.updateStatus(
      order.id,
      "CANCELLED",
      tx,
    );

    return cancelledOrder;
  });
}
