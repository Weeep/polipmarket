import type { TotalMarketStats, UserMarketStats } from "@/modules/order/domain/Order";
import type { Event } from "@/modules/event/domain/Event";
import type { Outcome, OutcomeWithPrices } from "@/modules/market/domain/Outcome";

export type MarketStatus = "OPEN" | "CLOSED" | "RESOLVED" | "CANCELLED";

export type MarketType = "BINARY";

export type AmmCurve = "CPMM" | "LMSR";

export interface MarketAmmConfig {
  id: string;
  marketId: string;
  curve: AmmCurve;
  feeBps: number;
  lmsrB?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketStats = {
  totalMarketStats: TotalMarketStats;
  userMarketStats: UserMarketStats;
};

export interface Market {
  id: string;
  eventId: string;
  event?: Event;
  question: string;
  description?: string | null;
  status: MarketStatus;
  type: MarketType;
  bettingCloseAt: Date;
  resolveAt?: Date | null;
  resolvedOutcomeId?: string | null;
  resolvedPosition?: "YES" | "NO" | null;
  createdBy: string;
  createdAt: Date;
  outcomes?: Outcome[];
  ammConfig?: MarketAmmConfig | null;
}

export type MarketSummary = Market & {
  outcomes?: OutcomeWithPrices[];
  marketStats?: MarketStats | null;
};
