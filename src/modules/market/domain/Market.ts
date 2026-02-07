import {
  TotalMarketStats,
  UserMarketStats,
} from "@/modules/order/domain/Order";

export type MarketStatus = "OPEN" | "CLOSED" | "RESOLVED" | "CANCELLED";

export type MarketType = "BINARY" | "MULTI_CHOICE";

export type OutcomeStatus = "ACTIVE" | "INACTIVE" | "RESOLVED";

export type AmmCurve = "CPMM" | "LMSR";

export interface Outcome {
  id: string;
  marketId: string;
  slug: string;
  label: string;
  position: number;
  status: OutcomeStatus;
  createdAt: Date;
}

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
