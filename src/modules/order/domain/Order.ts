export type OrderStatus = "OPEN" | "FILLED" | "CANCELLED";

export type OrderSide = "BUY" | "SELL";

export interface TotalMarketStats {
  totalBets: number;
  totalVolume: number;
}

export interface UserMarketStats {
  userBets: number;
  userVolume: number;
}

export interface Order {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  side: OrderSide;
  price: number; // 0..1
  amount: number; // stake
  status: OrderStatus;
  createdAt: Date;
}
