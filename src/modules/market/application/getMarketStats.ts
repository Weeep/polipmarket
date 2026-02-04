import { orderRepository } from "@/modules/order/infrastructure/orderRepository";

export async function getMarketStats(marketId: string, userId?: string) {
  return orderRepository.getMarketStats(marketId, userId);
}
