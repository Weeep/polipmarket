import type { MarketSummary } from "@/modules/market/domain/Market";

export interface Event {
  id: string;
  question: string;
  description?: string | null;
  bettingCloseAt: Date;
  resolveAt?: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EventStats = {
  totalBets: number;
  totalVolume: number;
};

export type EventSummary = Event & {
  markets: MarketSummary[];
  eventStats?: EventStats;
};
