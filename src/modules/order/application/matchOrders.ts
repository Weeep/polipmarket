import { orderRepository } from "../infrastructure/orderRepository";

export async function matchOrders(marketId: string) {
  const orders = await orderRepository.findOpensByMarket(marketId);

  // TODO:
  // - price matching
  // - wallet lock / release
  // - partial fill

  for (const order of orders) {
    // ideiglenes: auto-fill
    await orderRepository.updateStatus(order.id, "FILLED");
  }

  //TODO return value
}
