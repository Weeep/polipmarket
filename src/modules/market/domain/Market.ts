import {
  TotalMarketStats,
  UserMarketStats,
} from "@/modules/order/domain/Order";

export type MarketStatus = "OPEN" | "CLOSED" | "RESOLVED";

export type MarketStats = {
  totalMarketStats: TotalMarketStats;
  userMarketStats: UserMarketStats;
};

export interface Market {
  id: string;
  question: string;
  description?: string | null;
  status: MarketStatus;
  closeAt: Date;
  createdBy: string;
  createdAt: Date;
}
